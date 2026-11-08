<?php

namespace App\Services\AI;

use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use RuntimeException;

class MessageService
{
    /** Stable marker so the controller can expose this gate as a machine-readable code. */
    public const CHAT_DISABLED_MESSAGE = 'AI Companion chat is not enabled yet.';

    private const DEFAULT_HISTORY_LIMIT = 30;

    private const MAX_HISTORY_LIMIT = 100;

    public function __construct(
        private readonly AIChatService $chat,
        private readonly UserMemoryService $memories,
    ) {}

    /**
     * Return one page of conversation history, oldest first.
     *
     * @return array{data: list<Message>, meta: array{has_more: bool, next_before_id: string|null}}
     */
    public function history(User $user, Conversation $conversation, int $limit = self::DEFAULT_HISTORY_LIMIT, ?string $beforeId = null): array
    {
        $this->ensureOwner($user, $conversation);

        $limit = max(1, min($limit, self::MAX_HISTORY_LIMIT));
        $query = Message::query()->where('conversation_id', $conversation->id);

        if ($beforeId !== null && $beforeId !== '') {
            $anchor = Message::query()
                ->where('conversation_id', $conversation->id)
                ->whereKey($beforeId)
                ->first();
            if ($anchor === null) {
                throw ValidationException::withMessages([
                    'before_id' => 'The before_id cursor is not part of this conversation.',
                ]);
            }
            // Cursor on (created_at, id) so equal timestamps still page deterministically.
            $query->where(function ($query) use ($anchor): void {
                $query->where('created_at', '<', $anchor->created_at)
                    ->orWhere(function ($query) use ($anchor): void {
                        $query->where('created_at', $anchor->created_at)->where('id', '<', $anchor->id);
                    });
            });
        }

        $rows = $query->orderByDesc('created_at')->orderByDesc('id')->limit($limit + 1)->get();
        $hasMore = $rows->count() > $limit;
        if ($hasMore) {
            $rows = $rows->slice(0, $limit)->values();
        }
        $messages = $rows->reverse()->values();

        return [
            'data' => $messages->all(),
            'meta' => [
                'has_more' => $hasMore,
                'next_before_id' => $hasMore && $messages->isNotEmpty() ? $messages->first()->id : null,
            ],
        ];
    }

    /**
     * Send one user message and persist the assistant reply atomically after the AI call succeeds.
     *
     * @return array{user_message: Message, assistant_message: Message}
     */
    public function send(User $user, Conversation $conversation, array $data): array
    {
        if (! (bool) config('services.ai.chat_enabled', false)) {
            throw new RuntimeException(self::CHAT_DISABLED_MESSAGE, 503);
        }
        $this->ensureOwner($user, $conversation);

        $content = trim((string) ($data['content'] ?? ''));
        if ($content === '') {
            throw ValidationException::withMessages(['content' => 'The content field is required.']);
        }
        $clientMessageId = isset($data['client_message_id']) && is_string($data['client_message_id'])
            ? $data['client_message_id']
            : null;

        // Best-effort idempotency: durable uniqueness needs the M1 migration.
        $replay = $this->findStoredPair($conversation, $clientMessageId);
        if ($replay !== null) {
            return $replay;
        }

        $messages = $this->conversationContext($conversation);
        $messages[] = ['role' => 'user', 'content' => $content];
        // Memory is owner-scoped and active-only; capped to the AI service contract limits.
        $memoryLimit = max(0, min((int) config('services.ai.chat_memory_limit', 10), 20));
        $memory = array_map(
            static fn (string $entry): string => mb_substr($entry, 0, 500),
            $this->memories->activeForPrompt($user, $memoryLimit),
        );
        $reply = $this->chat->reply($messages, $memory);

        // No partial rows: both messages are written only after the AI call succeeded.
        return DB::transaction(function () use ($conversation, $content, $clientMessageId, $reply): array {
            $now = now();
            $userMetadata = $clientMessageId !== null ? ['client_message_id' => $clientMessageId] : null;
            $assistantMetadata = $clientMessageId !== null
                ? $reply['meta'] + ['client_message_id' => $clientMessageId]
                : $reply['meta'];

            $userMessage = $this->persistMessage($conversation, 'user', $content, $userMetadata, $now);
            // Assistant is one millisecond later so (created_at, id) ordering is deterministic.
            $assistantMessage = $this->persistMessage(
                $conversation,
                'assistant',
                $reply['content'],
                $assistantMetadata === [] ? null : $assistantMetadata,
                $now->copy()->addMilliseconds(1),
            );

            if ($conversation->title === null || trim((string) $conversation->title) === '') {
                $conversation->title = Str::limit($content, 120);
            }
            $conversation->updated_at = $now;
            $conversation->save();

            return ['user_message' => $userMessage, 'assistant_message' => $assistantMessage];
        });
    }

    /**
     * Persist one immutable message row with an explicit timestamp.
     *
     * created_at is set after mass assignment because it is intentionally not fillable.
     */
    private function persistMessage(
        Conversation $conversation,
        string $role,
        string $content,
        ?array $metadata,
        \DateTimeInterface $createdAt,
    ): Message
    {
        $message = new Message([
            'conversation_id' => $conversation->id,
            'role' => $role,
            'content' => $content,
            'metadata' => $metadata,
        ]);
        $message->created_at = $createdAt;
        $message->save();

        return $message;
    }

    /** @return array{user_message: Message, assistant_message: Message}|null */
    private function findStoredPair(Conversation $conversation, ?string $clientMessageId): ?array
    {
        if ($clientMessageId === null) {
            return null;
        }

        $userMessage = Message::query()
            ->where('conversation_id', $conversation->id)
            ->where('role', 'user')
            ->where('metadata->client_message_id', $clientMessageId)
            ->orderByDesc('created_at')
            ->first();
        if ($userMessage === null) {
            return null;
        }

        $assistantMessage = Message::query()
            ->where('conversation_id', $conversation->id)
            ->where('role', 'assistant')
            ->where('metadata->client_message_id', $clientMessageId)
            ->where('created_at', '>', $userMessage->created_at)
            ->orderBy('created_at')
            ->orderBy('id')
            ->first();

        return $assistantMessage === null
            ? null
            : ['user_message' => $userMessage, 'assistant_message' => $assistantMessage];
    }

    /**
     * Build the recent turns sent as context, oldest first.
     *
     * The AI service accepts at most 20 messages per request, so one slot is reserved for
     * the new user turn.
     *
     * @return list<array{role: string, content: string}>
     */
    private function conversationContext(Conversation $conversation): array
    {
        $limit = max(1, min((int) config('services.ai.chat_history_limit', 20), 19));

        return Message::query()
            ->where('conversation_id', $conversation->id)
            ->whereIn('role', ['user', 'assistant'])
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->limit($limit)
            ->get(['role', 'content'])
            ->reverse()
            ->map(static fn (Message $message): array => [
                'role' => (string) $message->role,
                // The AI service caps each message at 8000 characters.
                'content' => mb_substr((string) $message->content, 0, 8000),
            ])
            ->values()
            ->all();
    }

    private function ensureOwner(User $user, Conversation $conversation): void
    {
        if ((string) $conversation->user_id !== (string) $user->id) {
            throw (new ModelNotFoundException)->setModel(Conversation::class, [$conversation->getKey()]);
        }
    }
}
