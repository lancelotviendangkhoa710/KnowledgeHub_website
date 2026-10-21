<?php

namespace App\Http\Controllers\Learning;

use App\Http\Controllers\Controller;
use App\Http\Requests\Learning\UpdateRoadmapItemProgressRequest;
use App\Models\RoadmapItem;
use App\Policies\RoadmapPolicy;
use App\Services\Learning\RoadmapProgressService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RoadmapProgressController extends Controller
{
    public function __construct(
        private readonly RoadmapProgressService $progressService,
        private readonly RoadmapPolicy $roadmapPolicy,
    ) {}

    public function show(Request $request, RoadmapItem $item): JsonResponse
    {
        $item->load('roadmap');
        abort_unless($request->user() && $this->roadmapPolicy->viewProgress($request->user(), $item), 403);

        return response()->json(['status' => 'success', 'data' => $this->progressService->get($item)]);
    }

    public function update(UpdateRoadmapItemProgressRequest $request, RoadmapItem $item): JsonResponse
    {
        $item->load('roadmap');
        $progress = $this->progressService->update($item, $request->validated('status'));

        return response()->json([
            'status' => 'success',
            'message' => 'Roadmap item progress updated successfully.',
            'data' => $progress,
        ]);
    }
}