<?php

namespace App\Http\Controllers\AI;

use App\Http\Controllers\Controller;
use App\Http\Requests\AI\StoreUserMemoryRequest;
use App\Http\Requests\AI\UpdateUserMemoryRequest;
use App\Models\UserMemory;
use App\Services\AI\UserMemoryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * AI-03 explicit-only user memory API.
 *
 * Routes are owner-scoped: `find()` filters by the authenticated user first,
 * so foreign/unknown ids (including Admin) return 404 without revealing that
 * the row exists. Policy checks remain as defence in depth.
 */
class UserMemoryController extends Controller
{
    public function __construct(private readonly UserMemoryService $memories) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', UserMemory::class);

        $page = $this->memories->list($request->user());

        return response()->json([
            'status' => 'success',
            'message' => 'Memories retrieved successfully.',
            'data' => $page->items(),
            'meta' => [
                'current_page' => $page->currentPage(),
                'last_page' => $page->lastPage(),
                'per_page' => $page->perPage(),
                'total' => $page->total(),
            ],
        ]);
    }

    public function store(StoreUserMemoryRequest $request): JsonResponse
    {
        $this->authorize('create', UserMemory::class);

        return response()->json([
            'status' => 'success',
            'message' => 'Memory created successfully.',
            'data' => $this->memories->create($request->user(), $request->validated()),
        ], 201);
    }

    public function update(UpdateUserMemoryRequest $request, string $memory): JsonResponse
    {
        $model = $this->memories->find($request->user(), $memory);
        $this->authorize('update', $model);

        return response()->json([
            'status' => 'success',
            'message' => 'Memory updated successfully.',
            'data' => $this->memories->update($model, $request->validated()),
        ]);
    }

    public function destroy(Request $request, string $memory): JsonResponse
    {
        $model = $this->memories->find($request->user(), $memory);
        $this->authorize('delete', $model);

        $this->memories->delete($model);

        return response()->json([
            'status' => 'success',
            'message' => 'Memory deleted successfully.',
        ]);
    }
}
