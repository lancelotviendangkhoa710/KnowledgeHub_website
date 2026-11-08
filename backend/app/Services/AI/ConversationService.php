<?php

namespace App\Services\AI;

use App\Models\Conversation;
use App\Models\User;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;

/**
 * AI-01 conversation persistence.
 *
 * Every read path is owner-scoped so a foreign or unknown UUID resolves to
 * 404 through firstOrFail() and never leaks existence. The user_id is always
 * taken from the authenticated actor, never from request payload.
 */
class ConversationService
{
    private const PER_PAGE = 20;

    public function list(User $user): LengthAwarePaginator
    {
        return Conversation::query()
            ->where('user_id', $user->id)
            ->withCount('messages')
            ->orderByDesc('created_at')
            ->paginate(self::PER_PAGE);
    }

    public function find(User $user, string $conversationId): Conversation
    {
        return Conversation::query()
            ->whereKey($conversationId)
            ->where('user_id', $user->id)
            ->withCount('messages')
            ->firstOrFail();
    }

    public function create(User $user, array $attributes): Conversation
    {
        $conversation = Conversation::query()->create([
            'user_id' => $user->id,
            'title' => $attributes['title'] ?? null,
        ]);

        // Re-read with the aggregate so messages_count is part of the original
        // attribute set (a later save() must never try to persist the alias).
        return $this->findWithMessageCount((string) $conversation->getKey());
    }

    public function update(Conversation $conversation, array $attributes): Conversation
    {
        $conversation->update(['title' => $attributes['title']]);

        return $this->findWithMessageCount((string) $conversation->getKey());
    }

    /**
     * Hard delete; the messages FK cascades from the conversations row.
     */
    public function delete(Conversation $conversation): void
    {
        DB::transaction(fn () => $conversation->delete());
    }

    private function findWithMessageCount(string $conversationId): Conversation
    {
        return Conversation::query()
            ->whereKey($conversationId)
            ->withCount('messages')
            ->firstOrFail();
    }
}
