<?php

namespace App\Http\Controllers\Learning;

use App\Http\Controllers\Controller;
use App\Http\Requests\Learning\StoreRoadmapRequest;
use App\Http\Requests\Learning\UpdateRoadmapRequest;
use App\Services\Learning\RoadmapService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RoadmapController extends Controller
{
    public function __construct(private readonly RoadmapService $roadmaps) {}

    public function index(Request $request): JsonResponse
    {
        return response()->json(['status' => 'success', 'data' => $this->roadmaps->list($request->user())]);
    }

    public function store(StoreRoadmapRequest $request): JsonResponse
    {
        $roadmap = $this->roadmaps->create($request->user(), $request->validated());

        return response()->json(['status' => 'success', 'data' => $roadmap->load('items')], 201);
    }

    public function show(Request $request, string $roadmap): JsonResponse
    {
        return response()->json(['status' => 'success', 'data' => $this->roadmaps->find($request->user(), $roadmap)]);
    }

    public function update(UpdateRoadmapRequest $request, string $roadmap): JsonResponse
    {
        $model = $this->roadmaps->find($request->user(), $roadmap);

        return response()->json([
            'status' => 'success',
            'data' => $this->roadmaps->update($model, $request->validated()),
        ]);
    }

    public function destroy(Request $request, string $roadmap): JsonResponse
    {
        $model = $this->roadmaps->find($request->user(), $roadmap);
        $this->roadmaps->delete($model);

        return response()->json(['status' => 'success']);
    }
}