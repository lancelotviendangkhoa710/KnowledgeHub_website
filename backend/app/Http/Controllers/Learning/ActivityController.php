<?php

namespace App\Http\Controllers\Learning;

use App\Http\Controllers\Controller;
use App\Http\Requests\Learning\ActivityRangeRequest;
use App\Http\Requests\Learning\RecentActivityRequest;
use App\Services\Learning\LearningActivityService;
use Illuminate\Http\JsonResponse;

/** PRF-06, PRF-07: the caller's own learning activity (heatmap and history). */
class ActivityController extends Controller
{
    public function __construct(private readonly LearningActivityService $activity) {}

    public function daily(ActivityRangeRequest $request): JsonResponse
    {
        $range = $request->validated();

        return response()->json([
            'status' => 'success',
            'message' => 'Learning activity retrieved successfully.',
            'data' => $this->activity->daily($request->user(), $range['from'], $range['to']),
        ]);
    }

    public function recent(RecentActivityRequest $request): JsonResponse
    {
        $input = $request->validated();
        $page = $this->activity->recent($request->user(), (int) ($input['page'] ?? 1), $input['date'] ?? null);

        return response()->json([
            'status' => 'success',
            'message' => 'Recent learning activity retrieved successfully.',
            'data' => $page->items(),
            'meta' => [
                'current_page' => $page->currentPage(),
                'per_page' => $page->perPage(),
                'total' => $page->total(),
                'last_page' => $page->lastPage(),
            ],
        ]);
    }
}
