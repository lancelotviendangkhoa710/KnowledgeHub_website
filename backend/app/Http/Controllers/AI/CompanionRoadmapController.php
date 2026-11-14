<?php

namespace App\Http\Controllers\AI;

use App\Http\Controllers\Controller;
use App\Models\Conversation;
use App\Models\LearningRoadmap;
use App\Services\AI\CompanionRoadmapService;
use App\Services\AI\MessageService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use RuntimeException;

class CompanionRoadmapController extends Controller
{
    public function __construct(private readonly CompanionRoadmapService $roadmaps) {}

    public function preview(Request $request, string $conversation): JsonResponse
    {
        $model = $this->ownedConversation($request, $conversation);
        $this->authorize('update', $model);
        $key = 'ai-roadmap-preview:'.$request->user()->id;
        if (RateLimiter::tooManyAttempts($key, 10)) {
            return response()->json(['status' => 'error', 'message' => 'Too many roadmap previews. Please retry later.', 'data' => null], 429)
                ->header('Retry-After', (string) RateLimiter::availableIn($key));
        }
        RateLimiter::hit($key, 60);

        try {
            $data = $this->roadmaps->preview($request->user(), $model);
        } catch (RuntimeException $exception) {
            return $this->error($exception);
        }

        return response()->json(['status' => 'success', 'message' => 'Roadmap preview prepared.', 'data' => $data]);
    }

    public function confirm(Request $request, string $conversation): JsonResponse
    {
        $model = $this->ownedConversation($request, $conversation);
        $this->authorize('update', $model);
        $this->authorize('create', LearningRoadmap::class);
        $validated = $request->validate(['preview_token' => ['required', 'string', 'max:150000']]);

        try {
            $result = $this->roadmaps->confirm($request->user(), $model, $validated['preview_token']);
        } catch (RuntimeException $exception) {
            return $this->error($exception);
        }

        return response()->json([
            'status' => 'success',
            'message' => $result['replayed'] ? 'Roadmap was already saved.' : 'Roadmap saved successfully.',
            'data' => $result['roadmap'],
        ], $result['replayed'] ? 200 : 201);
    }

    private function ownedConversation(Request $request, string $conversation): Conversation
    {
        return Conversation::query()->where('user_id', $request->user()->id)->whereKey($conversation)->firstOrFail();
    }

    private function error(RuntimeException $exception): JsonResponse
    {
        $status = in_array($exception->getCode(), [409, 502, 503, 504], true) ? $exception->getCode() : 502;
        $payload = ['status' => 'error', 'message' => $exception->getMessage(), 'data' => null];
        if ($status === 503 && $exception->getMessage() === MessageService::CHAT_DISABLED_MESSAGE) {
            $payload['code'] = 'chat_disabled';
        }
        return response()->json($payload, $status);
    }
}
