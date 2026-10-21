<?php

namespace Tests\Feature\Learning;

use App\Models\LearningRoadmap;
use App\Models\RoadmapItem;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

class RoadmapItemPrerequisiteTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_cannot_manage_prerequisites(): void
    {
        [$item, $prerequisite] = $this->itemsFor($this->user());

        $this->postJson($this->path($item), ['prerequisite_item_id' => $prerequisite->id])->assertUnauthorized();
        $this->deleteJson($this->path($item)."/{$prerequisite->id}")->assertUnauthorized();
    }

    public function test_owner_can_add_and_remove_a_prerequisite(): void
    {
        $owner = $this->user();
        [$item, $prerequisite] = $this->itemsFor($owner);

        $this->actingAs($owner)
            ->postJson($this->path($item), ['prerequisite_item_id' => $prerequisite->id])
            ->assertCreated()
            ->assertJsonPath('data.roadmap_item_id', $item->id)
            ->assertJsonPath('data.prerequisite_item_id', $prerequisite->id);

        $this->actingAs($owner)
            ->deleteJson($this->path($item)."/{$prerequisite->id}")
            ->assertOk();

        $this->assertDatabaseMissing('roadmap_item_prerequisites', [
            'roadmap_item_id' => $item->id,
            'prerequisite_item_id' => $prerequisite->id,
        ]);
    }

    public function test_foreign_owner_cannot_manage_prerequisites(): void
    {
        [$item, $prerequisite] = $this->itemsFor($this->user());

        $this->actingAs($this->user())
            ->postJson($this->path($item), ['prerequisite_item_id' => $prerequisite->id])
            ->assertForbidden();
    }

    public function test_admin_can_manage_any_roadmap_prerequisites(): void
    {
        [$item, $prerequisite] = $this->itemsFor($this->user());
        $admin = $this->user();
        $roleId = (string) Str::uuid();
        DB::table('roles')->insert(['id' => $roleId, 'name' => 'admin', 'created_at' => now(), 'updated_at' => now()]);
        DB::table('user_roles')->insert(['user_id' => $admin->id, 'role_id' => $roleId, 'created_at' => now()]);

        $this->actingAs($admin)
            ->postJson($this->path($item), ['prerequisite_item_id' => $prerequisite->id])
            ->assertCreated();
    }

    public function test_missing_prerequisite_is_not_found(): void
    {
        [$item] = $this->itemsFor($this->user());

        $this->actingAs($item->roadmap->user)
            ->postJson($this->path($item), ['prerequisite_item_id' => (string) Str::uuid()])
            ->assertNotFound();
    }

    public function test_cross_roadmap_prerequisite_is_rejected(): void
    {
        $owner = $this->user();
        [$item] = $this->itemsFor($owner);
        [, $foreignPrerequisite] = $this->itemsFor($owner, 3);

        $this->actingAs($owner)
            ->postJson($this->path($item), ['prerequisite_item_id' => $foreignPrerequisite->id])
            ->assertUnprocessable();
    }

    public function test_duplicate_and_cycle_edges_are_rejected(): void
    {
        $owner = $this->user();
        [$a, $b, $c] = $this->itemsFor($owner, 1, 3);

        $this->add($owner, $b, $a)->assertCreated();
        $this->add($owner, $b, $a)->assertConflict();
        $this->add($owner, $a, $a)->assertUnprocessable();
        $this->add($owner, $c, $b)->assertCreated();
        $this->add($owner, $a, $c)->assertUnprocessable();
    }

    public function test_item_deletion_cascades_prerequisite_edges(): void
    {
        $owner = $this->user();
        [$item, $prerequisite] = $this->itemsFor($owner);
        $this->add($owner, $item, $prerequisite)->assertCreated();

        $prerequisite->delete();

        $this->assertDatabaseMissing('roadmap_item_prerequisites', ['roadmap_item_id' => $item->id]);
    }

    private function add(User $user, RoadmapItem $item, RoadmapItem $prerequisite): \Illuminate\Testing\TestResponse
    {
        return $this->actingAs($user)->postJson($this->path($item), ['prerequisite_item_id' => $prerequisite->id]);
    }

    private function path(RoadmapItem $item): string
    {
        return "/api/learning/roadmap-items/{$item->id}/prerequisites";
    }

    /** @return array<int, RoadmapItem> */
    private function itemsFor(User $owner, int $startPosition = 1, int $count = 2): array
    {
        $roadmap = LearningRoadmap::query()->create([
            'user_id' => $owner->id,
            'title' => 'Roadmap',
            'goal' => 'Learn safely',
            'status' => 'active',
        ]);

        return collect(range($startPosition, $startPosition + $count - 1))
            ->map(fn (int $position): RoadmapItem => RoadmapItem::query()->create([
                'roadmap_id' => $roadmap->id,
                'title' => "Item {$position}",
                'position' => $position,
                'status' => 'pending',
            ]))
            ->all();
    }

    private function user(): User
    {
        $user = new User([
            'name' => 'Learning User',
            'email' => fake()->unique()->safeEmail(),
            'password' => 'password',
            'status' => 'active',
        ]);
        $user->id = (string) Str::uuid();
        $user->save();

        return $user;
    }
}