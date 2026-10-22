<?php

namespace App\Http\Controllers\Learning;

use App\Http\Controllers\Controller;
use App\Http\Requests\Learning\UpdateRoadmapItemProgressRequest;
use App\Models\RoadmapItem;
use App\Services\Learning\RoadmapProgressService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RoadmapProgressController extends Controller
{
    public function __construct(private readonly RoadmapProgressService $progressService) {}

    public function show(Request $request, RoadmapItem $item): JsonResponse
    {
        $item->loadMissing('roadmap');
        $this->authorize('viewProgress', $item);

        return response()->json([
            'status' => 'success',
            'message' => 'Roadmap item progress retrieved successfully.',
            'data' => $this->progressService->get($item),
        ]);
    }

    public function update(UpdateRoadmapItemProgressRequest $request, RoadmapItem $item): JsonResponse
    {
        $item->loadMissing('roadmap');
        $progress = $this->progressService->update($item, $request->validated('status'));

        return response()->json([
            'status' => 'success',
            'message' => 'Roadmap item progress updated successfully.',
            'data' => $progress,
        ]);
    }
}