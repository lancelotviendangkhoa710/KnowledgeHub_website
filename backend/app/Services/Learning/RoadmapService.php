<?php

namespace App\Services\Learning;

use App\Models\LearningRoadmap;
use App\Models\RoadmapItem;
use App\Models\User;
use App\Policies\RoadmapPolicy;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Facades\DB;

class RoadmapService
{
    public function __construct(private readonly RoadmapPolicy $policy) {}

    public function list(User $user): mixed
    {
        $query = LearningRoadmap::query()->with('items');
        if (! $this->policy->isAdmin($user)) {
            $query->where('user_id', $user->id);
        }

        return $query->orderByDesc('created_at')->get();
    }

    public function find(User $user, string $roadmapId): LearningRoadmap
    {
        $query = LearningRoadmap::query()->with('items')->whereKey($roadmapId);
        if (! $this->policy->isAdmin($user)) {
            $query->where('user_id', $user->id);
        }

        return $query->firstOrFail();
    }

    public function create(User $user, array $attributes): LearningRoadmap
    {
        return DB::transaction(fn (): LearningRoadmap => LearningRoadmap::query()->create([
            ...$attributes,
            'user_id' => $user->id,
        ]));
    }

    public function update(LearningRoadmap $roadmap, array $attributes): LearningRoadmap
    {
        return DB::transaction(function () use ($roadmap, $attributes): LearningRoadmap {
            $roadmap->update($attributes);
            return $roadmap->fresh(['items']);
        });
    }

    public function delete(LearningRoadmap $roadmap): void
    {
        DB::transaction(fn () => $roadmap->delete());
    }

    public function createItem(LearningRoadmap $roadmap, array $attributes): RoadmapItem
    {
        return DB::transaction(fn (): RoadmapItem => $roadmap->items()->create($attributes));
    }

    public function findItem(LearningRoadmap $roadmap, string $itemId): RoadmapItem
    {
        return $roadmap->items()->whereKey($itemId)->firstOrFail();
    }

    public function updateItem(RoadmapItem $item, array $attributes): RoadmapItem
    {
        return DB::transaction(function () use ($item, $attributes): RoadmapItem {
            $item->update($attributes);
            return $item->fresh();
        });
    }

    public function deleteItem(RoadmapItem $item): void
    {
        DB::transaction(fn () => $item->delete());
    }
}