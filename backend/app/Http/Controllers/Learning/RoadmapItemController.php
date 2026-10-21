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
        $model = $this->roadmaps->find($request->user(), $roadmap);
        $item = $this->roadmaps->createItem($model, $request->validated());

        return response()->json(['status' => 'success', 'data' => $item], 201);
    }

    public function update(UpdateRoadmapItemRequest $request, string $roadmap, string $item): JsonResponse
    {
        $model = $this->roadmaps->find($request->user(), $roadmap);
        $roadmapItem = $this->roadmaps->findItem($model, $item);

        return response()->json(['status' => 'success', 'data' => $this->roadmaps->updateItem($roadmapItem, $request->validated())]);
    }

    public function destroy(Request $request, string $roadmap, string $item): JsonResponse
    {
        $model = $this->roadmaps->find($request->user(), $roadmap);
        $this->roadmaps->deleteItem($this->roadmaps->findItem($model, $item));

        return response()->json(['status' => 'success']);
    }
}