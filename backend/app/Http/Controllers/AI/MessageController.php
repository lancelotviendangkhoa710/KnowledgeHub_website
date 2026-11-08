<?php

namespace App\Http\Controllers\AI;

use App\Http\Controllers\Controller;
use App\Http\Requests\AI\SendMessageRequest;
use App\Models\Conversation;
use App\Services\AI\MessageService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use RuntimeException;

class MessageController extends Controller
{
    public function __construct(private readonly MessageService $messages) {}

    /** Return one page of the authenticated user's conversation history. */
    public function index(Request $request, string $conversation): JsonResponse
    {
        $conversationModel = $this->resolveConversation($request, $conversation);
        $this->authorize('view', $conversationModel);
        $validated = $request->validate([
            'limit' => ['sometimes', 'integer', 'min:1', 'max:100'],
            'before_id' => ['sometimes', 'uuid'],
        ]);

        $page = $this->messages->history(
            $request->user(),
            $conversationModel,
            isset($validated['limit']) ? (int) $validated['limit'] : 30,
            $validated['before_id'] ?? null,
        );

        return response()->json([
            'status' => 'success',
            'message' => 'Message history retrieved.',
            'data' => $page['data'],
            'meta' => $page['meta'],
        ]);
    }

    /** Send one message and return the persisted user/assistant pair. */
    public function store(SendMessageRequest $request, string $conversation): JsonResponse
    {
        $user = $request->user();
        $key = 'ai-chat-send:'.$user->id;
        if (RateLimiter::tooManyAttempts($key, 20)) {
            return response()->json(['status' => 'error', 'message' => 'Too many chat messages. Please slow down.'], 429)
                ->header('Retry-After', (string) RateLimiter::availableIn($key));
        }
        RateLimiter::hit($key, 60);

        $conversationModel = $this->resolveConversation($request, $conversation);
        $this->authorize('update', $conversationModel);

        try {
            $result = $this->messages->send($user, $conversationModel, $request->validated());
        } catch (RuntimeException $exception) {
            return $this->errorResponse($exception);
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Message sent successfully.',
            'data' => [
                'user_message' => $result['user_message'],
                'assistant_message' => $result['assistant_message'],
            ],
        ], 201);
    }

    /** Resolve the conversation through an owner-scoped query so foreign ids become 404. */
    private function resolveConversation(Request $request, string $conversation): Conversation
    {
        return Conversation::query()
            ->where('user_id', $request->user()->id)
            ->whereKey($conversation)
            ->firstOrFail();
    }

    private function errorResponse(RuntimeException $exception): JsonResponse
    {
        $code = (int) $exception->getCode();
        $status = in_array($code, [502, 503, 504], true) ? $code : 502;
        $payload = ['status' => 'error', 'message' => $exception->getMessage()];
        if ($status === 503 && $exception->getMessage() === MessageService::CHAT_DISABLED_MESSAGE) {
            $payload['code'] = 'chat_disabled';
        }

        return response()->json($payload, $status);
    }
}
