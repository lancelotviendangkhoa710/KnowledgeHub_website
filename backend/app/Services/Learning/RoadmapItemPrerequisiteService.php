<?php

namespace App\Services\Learning;

use App\Exceptions\Learning\PrerequisiteException;
use App\Models\RoadmapItem;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class RoadmapItemPrerequisiteService
{
    public function __construct(private readonly PrerequisiteGraphValidator $validator) {}

    /** @return array{roadmap_item_id: string, prerequisite_item_id: string} */
    public function add(RoadmapItem $item, string $prerequisiteId): array
    {
        return $this->withinLockedRoadmap($item, function (array $lockedItems) use ($item, $prerequisiteId): array {
            $this->assertPrerequisiteInRoadmap($lockedItems, $prerequisiteId);

            $edge = ['roadmap_item_id' => $item->id, 'prerequisite_item_id' => $prerequisiteId];
            $existingEdges = $this->edgesForRoadmap($item->roadmap_id);

            if (in_array($edge, $existingEdges, true)) {
                throw new PrerequisiteException('This prerequisite relationship already exists.', 409);
            }

            try {
                $this->validator->assertCanAddEdges($existingEdges, [$edge]);
            } catch (InvalidArgumentException $exception) {
                throw new PrerequisiteException($exception->getMessage(), 422);
            }

            DB::table('roadmap_item_prerequisites')->insert($edge);

            return $edge;
        });
    }

    public function remove(RoadmapItem $item, string $prerequisiteId): void
    {
        $this->withinLockedRoadmap($item, function (array $lockedItems) use ($item, $prerequisiteId): void {
            $this->assertPrerequisiteInRoadmap($lockedItems, $prerequisiteId);

            $deleted = DB::table('roadmap_item_prerequisites')
                ->where('roadmap_item_id', $item->id)
                ->where('prerequisite_item_id', $prerequisiteId)
                ->delete();

            if ($deleted === 0) {
                throw new ModelNotFoundException('Prerequisite relationship not found.');
            }
        });
    }

    /** @template T @param callable(array<string, RoadmapItem>): T $callback @return T */
    private function withinLockedRoadmap(RoadmapItem $item, callable $callback): mixed
    {
        return DB::transaction(function () use ($item, $callback): mixed {
            $lockedItems = RoadmapItem::query()
                ->where('roadmap_id', $item->roadmap_id)
                ->orderBy('id')
                ->lockForUpdate()
                ->get()
                ->keyBy('id')
                ->all();

            if (! isset($lockedItems[$item->id])) {
                throw (new ModelNotFoundException())->setModel(RoadmapItem::class, [$item->id]);
            }

            return $callback($lockedItems);
        }, 3);
    }

    /** @param array<string, RoadmapItem> $lockedItems */
    private function assertPrerequisiteInRoadmap(array $lockedItems, string $prerequisiteId): void
    {
        if (! RoadmapItem::query()->whereKey($prerequisiteId)->exists()) {
            throw (new ModelNotFoundException())->setModel(RoadmapItem::class, [$prerequisiteId]);
        }

        if (! isset($lockedItems[$prerequisiteId])) {
            throw new PrerequisiteException('Prerequisite item must belong to the same roadmap.', 422);
        }
    }

    /** @return array<int, array{roadmap_item_id: string, prerequisite_item_id: string}> */
    private function edgesForRoadmap(string $roadmapId): array
    {
        return DB::table('roadmap_item_prerequisites as prerequisites')
            ->join('roadmap_items as items', 'items.id', '=', 'prerequisites.roadmap_item_id')
            ->where('items.roadmap_id', $roadmapId)
            ->get(['prerequisites.roadmap_item_id', 'prerequisites.prerequisite_item_id'])
            ->map(fn (object $edge): array => (array) $edge)
            ->all();
    }
}