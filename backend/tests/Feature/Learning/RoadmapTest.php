<?php

namespace Tests\Feature\Learning;

use App\Models\LearningRoadmap;
use App\Models\RoadmapItem;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class RoadmapTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_cannot_read_or_write_roadmaps(): void
    {
        $roadmap = $this->roadmapFor($this->user());

        $this->getJson('/api/learning/roadmaps')->assertUnauthorized();
        $this->postJson('/api/learning/roadmaps', ['title' => 'Plan', 'goal' => 'Learn'])->assertUnauthorized();
        $this->getJson("/api/learning/roadmaps/{$roadmap->id}")->assertUnauthorized();
    }

    public function test_owner_lists_only_own_roadmaps_and_items_are_positioned(): void
    {
        $owner = $this->user();
        $mine = $this->roadmapFor($owner);
        $this->itemFor($mine, 2, 'Second');
        $this->itemFor($mine, 1, 'First');
        $foreign = $this->roadmapFor($this->user());
        Sanctum::actingAs($owner);

        $this->getJson('/api/learning/roadmaps')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $mine->id)
            ->assertJsonPath('data.0.items.0.title', 'First');

        $this->getJson("/api/learning/roadmaps/{$foreign->id}")->assertNotFound();
    }

    public function test_create_derives_owner_and_rejects_status_outside_schema(): void
    {
        $owner = $this->user();
        Sanctum::actingAs($owner);

        $this->postJson('/api/learning/roadmaps', [
            'title' => 'Platform engineering',
            'goal' => 'Build a roadmap',
            'user_id' => (string) Str::uuid(),
        ])->assertCreated()->assertJsonPath('data.user_id', $owner->id);

        $this->postJson('/api/learning/roadmaps', ['title' => 'Invalid', 'goal' => 'Invalid', 'status' => 'unknown'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('status');
    }

    public function test_foreign_roadmap_and_nested_item_are_not_disclosed_or_mutated(): void
    {
        $roadmap = $this->roadmapFor($this->user());
        $item = $this->itemFor($roadmap, 1, 'Private');
        Sanctum::actingAs($this->user());

        $this->putJson("/api/learning/roadmaps/{$roadmap->id}", ['title' => 'Changed'])->assertNotFound();
        $this->postJson("/api/learning/roadmaps/{$roadmap->id}/items", ['title' => 'Injected', 'position' => 2])->assertNotFound();
        $this->putJson("/api/learning/roadmaps/{$roadmap->id}/items/{$item->id}", ['title' => 'Changed'])->assertNotFound();
        $this->deleteJson("/api/learning/roadmaps/{$roadmap->id}/items/{$item->id}")->assertNotFound();
        $this->assertDatabaseHas('roadmap_items', ['id' => $item->id, 'title' => 'Private']);
    }

    public function test_admin_can_manage_another_users_roadmap(): void
    {
        $roadmap = $this->roadmapFor($this->user());
        $admin = $this->user();
        $roleId = (string) Str::uuid();
        DB::table('roles')->insert(['id' => $roleId, 'name' => 'admin', 'created_at' => now(), 'updated_at' => now()]);
        DB::table('user_roles')->insert(['user_id' => $admin->id, 'role_id' => $roleId, 'created_at' => now()]);
        Sanctum::actingAs($admin);

        $this->putJson("/api/learning/roadmaps/{$roadmap->id}", ['title' => 'Admin managed'])
            ->assertOk()
            ->assertJsonPath('data.title', 'Admin managed');
    }

    public function test_item_validation_and_roadmap_delete_cascade(): void
    {
        $owner = $this->user();
        $roadmap = $this->roadmapFor($owner);
        Sanctum::actingAs($owner);

        $this->postJson("/api/learning/roadmaps/{$roadmap->id}/items", ['title' => 'Invalid', 'position' => -1])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('position');
        $item = $this->itemFor($roadmap, 1, 'Cascade item');
        $this->postJson("/api/learning/roadmaps/{$roadmap->id}/items", ['title' => 'Duplicate', 'position' => 1])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('position');

        $this->deleteJson("/api/learning/roadmaps/{$roadmap->id}")->assertOk();
        $this->assertDatabaseMissing('learning_roadmaps', ['id' => $roadmap->id]);
        $this->assertDatabaseMissing('roadmap_items', ['id' => $item->id]);
    }

    private function user(): User
    {
        $user = new User(['name' => 'Learner', 'email' => fake()->unique()->safeEmail(), 'password' => 'password', 'status' => 'active']);
        $user->id = (string) Str::uuid();
        $user->save();

        return $user;
    }

    private function roadmapFor(User $user): LearningRoadmap
    {
        return LearningRoadmap::query()->create(['user_id' => $user->id, 'title' => 'Roadmap', 'goal' => 'Learn safely', 'status' => 'active']);
    }

    private function itemFor(LearningRoadmap $roadmap, int $position, string $title): RoadmapItem
    {
        return RoadmapItem::query()->create(['roadmap_id' => $roadmap->id, 'title' => $title, 'position' => $position, 'status' => 'pending']);
    }
}