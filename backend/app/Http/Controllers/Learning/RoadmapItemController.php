<?php

namespace App\Http\Controllers\Learning;

use App\Http\Controllers\Controller;
use App\Http\Requests\Learning\StoreRoadmapItemRequest;
use App\Http\Requests\Learning\UpdateRoadmapItemRequest;
use App\Services\Learning\RoadmapService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RoadmapItemController extends Controller
{
    public function __construct(private readonly RoadmapService $roadmaps) {}

    public function store(StoreRoadmapItemRequest $request, string $roadmap): JsonResponse
    {
        // find() still filters by owner so a foreign roadmap stays a 404 and its
        // existence is never disclosed; the Gate then enforces the policy rule.
        $model = $this->roadmaps->find($request->user(), $roadmap);
        $this->authorize('update', $model);

        $item = $this->roadmaps->createItem($model, $request->validated());

        return response()->json([
            'status' => 'success',
            'message' => 'Roadmap item created successfully.',
            'data' => $item,
        ], 201);
    }

    public function update(UpdateRoadmapItemRequest $request, string $roadmap, string $item): JsonResponse
    {
        $model = $this->roadmaps->find($request->user(), $roadmap);
        $roadmapItem = $this->roadmaps->findItem($model, $item);
        $this->authorize('manageItem', $roadmapItem);

        return response()->json([
            'status' => 'success',
            'message' => 'Roadmap item updated successfully.',
            'data' => $this->roadmaps->updateItem($roadmapItem, $request->validated()),
        ]);
    }

    public function destroy(Request $request, string $roadmap, string $item): JsonResponse
    {
        $model = $this->roadmaps->find($request->user(), $roadmap);
        $roadmapItem = $this->roadmaps->findItem($model, $item);
        $this->authorize('manageItem', $roadmapItem);

        $this->roadmaps->deleteItem($roadmapItem);

        return response()->json(['status' => 'success', 'message' => 'Roadmap item deleted successfully.']);
    }
}
