<?php

namespace App\Http\Controllers\AI;

use App\Http\Controllers\Controller;
use App\Http\Requests\AI\StoreConversationRequest;
use App\Http\Requests\AI\UpdateConversationRequest;
use App\Models\Conversation;
use App\Services\AI\ConversationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ConversationController extends Controller
{
    public function __construct(private readonly ConversationService $conversations) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Conversation::class);

        $page = $this->conversations->list($request->user());

        return response()->json([
            'status' => 'success',
            'message' => 'Conversations retrieved successfully.',
            'data' => $page->items(),
            'meta' => [
                'current_page' => $page->currentPage(),
                'per_page' => $page->perPage(),
                'total' => $page->total(),
                'last_page' => $page->lastPage(),
            ],
        ]);
    }

    public function store(StoreConversationRequest $request): JsonResponse
    {
        $this->authorize('create', Conversation::class);

        return response()->json([
            'status' => 'success',
            'message' => 'Conversation created successfully.',
            'data' => $this->conversations->create($request->user(), $request->validated()),
        ], 201);
    }

    public function show(Request $request, string $conversation): JsonResponse
    {
        $model = $this->conversations->find($request->user(), $conversation);
        $this->authorize('view', $model);

        return response()->json([
            'status' => 'success',
            'message' => 'Conversation retrieved successfully.',
            'data' => $model,
        ]);
    }

    public function update(UpdateConversationRequest $request, string $conversation): JsonResponse
    {
        $model = $this->conversations->find($request->user(), $conversation);
        $this->authorize('update', $model);

        return response()->json([
            'status' => 'success',
            'message' => 'Conversation updated successfully.',
            'data' => $this->conversations->update($model, $request->validated()),
        ]);
    }

    public function destroy(Request $request, string $conversation): JsonResponse
    {
        $model = $this->conversations->find($request->user(), $conversation);
        $this->authorize('delete', $model);

        $this->conversations->delete($model);

        return response()->json([
            'status' => 'success',
            'message' => 'Conversation deleted successfully.',
        ]);
    }
}
