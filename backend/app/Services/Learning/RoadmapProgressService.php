<?php

namespace App\Services\Learning;

use App\Models\LearningProgress;
use App\Models\RoadmapItem;
use Illuminate\Support\Facades\DB;

class RoadmapProgressService
{
    public function get(RoadmapItem $item): ?LearningProgress
    {
        return $item->progress()->first();
    }

    public function update(RoadmapItem $item, string $status): LearningProgress
    {
        return DB::transaction(function () use ($item, $status) {
            // Serialize writes for one item. This prevents duplicate 1:1 tracker creation.
            $lockedItem = RoadmapItem::query()
                ->whereKey($item->id)
                ->lockForUpdate()
                ->firstOrFail();

            $progress = LearningProgress::query()
                ->where('roadmap_item_id', $lockedItem->id)
                ->first();

            $now = now();
            $attributes = [
                'status' => $status,
                'updated_at' => $now,
            ];

            if ($status === 'in_progress' && (! $progress || $progress->started_at === null)) {
                $attributes['started_at'] = $now;
            }

            if ($status === 'completed') {
                // Preserve the first completion time on idempotent retries.
                if (! $progress || $progress->completed_at === null) {
                    $attributes['completed_at'] = $now;
                }
            } elseif ($progress && $progress->completed_at !== null) {
                $attributes['completed_at'] = null;
            }

            if (! $progress) {
                $progress = new LearningProgress(['roadmap_item_id' => $lockedItem->id]);
            }

            $progress->fill($attributes);
            $progress->save();

            // roadmap_items.status is a denormalized mirror used by roadmap
            // reads. learning_progress.status remains authoritative.
            if ($lockedItem->status !== $status) {
                $lockedItem->status = $status;
                $lockedItem->save();
            }

            return $progress->fresh();
        });
    }
}