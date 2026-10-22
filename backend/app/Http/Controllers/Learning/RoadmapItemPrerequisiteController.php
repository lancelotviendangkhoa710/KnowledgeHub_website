<?php

namespace App\Http\Controllers\Learning;

use App\Exceptions\Learning\PrerequisiteException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Learning\StoreRoadmapItemPrerequisiteRequest;
use App\Models\RoadmapItem;
use App\Services\Learning\RoadmapItemPrerequisiteService;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RoadmapItemPrerequisiteController extends Controller
{
    public function __construct(private readonly RoadmapItemPrerequisiteService $prerequisites) {}

    public function store(StoreRoadmapItemPrerequisiteRequest $request, RoadmapItem $item): JsonResponse
    {
        $item->loadMissing('roadmap');
        $this->authorize('managePrerequisites', $item);

        try {
            $edge = $this->prerequisites->add($item, $request->validated('prerequisite_item_id'));
        } catch (PrerequisiteException $exception) {
            return $this->error($exception->getMessage(), $exception->status);
        } catch (ModelNotFoundException) {
            return $this->error('Roadmap item not found.', 404);
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Prerequisite added successfully.',
            'data' => $edge,
        ], 201);
    }

    public function destroy(Request $request, RoadmapItem $item, string $prerequisite): JsonResponse
    {
        $item->loadMissing('roadmap');
        $this->authorize('managePrerequisites', $item);

        try {
            $this->prerequisites->remove($item, $prerequisite);
        } catch (PrerequisiteException $exception) {
            return $this->error($exception->getMessage(), $exception->status);
        } catch (ModelNotFoundException) {
            return $this->error('Roadmap item or prerequisite relationship not found.', 404);
        }

        return response()->json(['status' => 'success', 'message' => 'Prerequisite removed successfully.'], 200);
    }

    private function error(string $message, int $status): JsonResponse
    {
        return response()->json(['status' => 'error', 'message' => $message], $status);
    }
}