<?php

namespace App\Http\Controllers\Learning;

use App\Http\Controllers\Controller;
use App\Http\Requests\Learning\ListRoadmapsRequest;
use App\Http\Requests\Learning\StoreRoadmapRequest;
use App\Http\Requests\Learning\UpdateRoadmapRequest;
use App\Models\LearningRoadmap;
use App\Services\Learning\RoadmapService;
use App\Services\Learning\RoadmapSummaryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RoadmapController extends Controller
{
    public function __construct(
        private readonly RoadmapService $roadmaps,
        private readonly RoadmapSummaryService $summaries,
    ) {}

    public function index(ListRoadmapsRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $roadmaps = $this->roadmaps->list(
            $request->user(),
            (bool) ($validated['mine'] ?? false),
            $validated['origin'] ?? null,
            $request->filters(),
        );

        return response()->json([
            'status' => 'success',
            'message' => 'Roadmaps retrieved successfully.',
            'data' => $this->summaries->summarize($roadmaps),
        ]);
    }

    public function store(StoreRoadmapRequest $request): JsonResponse
    {
        $this->authorize('create', LearningRoadmap::class);

        $roadmap = $this->roadmaps->create($request->user(), $request->validated());

        return response()->json([
            'status' => 'success',
            'message' => 'Roadmap created successfully.',
            'data' => $roadmap->load('items'),
        ], 201);
    }

    public function show(Request $request, string $roadmap): JsonResponse
    {
        $model = $this->roadmaps->find($request->user(), $roadmap);
        $this->authorize('view', $model);

        return response()->json([
            'status' => 'success',
            'message' => 'Roadmap retrieved successfully.',
            'data' => $this->summaries->summarize(collect([$model]))[0],
        ]);
    }

    public function update(UpdateRoadmapRequest $request, string $roadmap): JsonResponse
    {
        $model = $this->roadmaps->find($request->user(), $roadmap);
        $this->authorize('update', $model);

        return response()->json([
            'status' => 'success',
            'message' => 'Roadmap updated successfully.',
            'data' => $this->roadmaps->update($model, $request->validated()),
        ]);
    }

    public function destroy(Request $request, string $roadmap): JsonResponse
    {
        $model = $this->roadmaps->find($request->user(), $roadmap);
        $this->authorize('delete', $model);

        $this->roadmaps->delete($model);

        return response()->json(['status' => 'success', 'message' => 'Roadmap deleted successfully.']);
    }
}
