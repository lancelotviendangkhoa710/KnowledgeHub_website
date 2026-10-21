<?php

namespace App\Http\Controllers\Learning;

use App\Exceptions\Learning\PrerequisiteException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Learning\StoreRoadmapItemPrerequisiteRequest;
use App\Models\RoadmapItem;
use App\Policies\RoadmapPolicy;
use App\Services\Learning\RoadmapItemPrerequisiteService;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RoadmapItemPrerequisiteController extends Controller
{
    public function __construct(
        private readonly RoadmapItemPrerequisiteService $prerequisites,
        private readonly RoadmapPolicy $roadmapPolicy,
    ) {}

    public function store(StoreRoadmapItemPrerequisiteRequest $request, RoadmapItem $item): JsonResponse
    {
        try {
            $edge = $this->prerequisites->add($item, $request->validated('prerequisite_item_id'));
        } catch (PrerequisiteException $exception) {
            return $this->error($exception->getMessage(), $exception->status);
        } catch (ModelNotFoundException) {
            return $this->error('Roadmap item not found.', 404);
        }

        return response()->json(['status' => 'success', 'data' => $edge], 201);
    }

    public function destroy(Request $request, RoadmapItem $item, string $prerequisite): JsonResponse
    {
        $item->load('roadmap');
        abort_unless($request->user() && $this->roadmapPolicy->managePrerequisites($request->user(), $item), 403);

        try {
            $this->prerequisites->remove($item, $prerequisite);
        } catch (PrerequisiteException $exception) {
            return $this->error($exception->getMessage(), $exception->status);
        } catch (ModelNotFoundException) {
            return $this->error('Roadmap item or prerequisite relationship not found.', 404);
        }

        return response()->json(['status' => 'success'], 200);
    }

    private function error(string $message, int $status): JsonResponse
    {
        return response()->json(['status' => 'error', 'message' => $message], $status);
    }
}