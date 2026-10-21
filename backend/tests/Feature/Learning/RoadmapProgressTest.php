<?php

namespace Tests\Feature\Learning;

use App\Models\LearningProgress;
use App\Models\LearningRoadmap;
use App\Models\RoadmapItem;
use App\Models\User;
use App\Services\Learning\RoadmapProgressService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

class RoadmapProgressTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_cannot_read_or_update_progress(): void
    {
        $item = $this->itemFor($this->user());

        $this->getJson("/api/learning/roadmap-items/{$item->id}/progress")->assertUnauthorized();
        $this->patchJson("/api/learning/roadmap-items/{$item->id}/progress", ['status' => 'in_progress'])->assertUnauthorized();
    }

    public function test_owner_reads_absent_progress_without_creating_tracker(): void
    {
        $owner = $this->user();
        $item = $this->itemFor($owner);

        $this->actingAs($owner)
            ->getJson("/api/learning/roadmap-items/{$item->id}/progress")
            ->assertOk()
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data', null);

        $this->assertDatabaseMissing('learning_progress', ['roadmap_item_id' => $item->id]);
    }

    public function test_foreign_owner_cannot_read_or_write_progress(): void
    {
        $item = $this->itemFor($this->user());
        $otherUser = $this->user();

        $this->actingAs($otherUser)
            ->getJson("/api/learning/roadmap-items/{$item->id}/progress")
            ->assertForbidden();
        $this->actingAs($otherUser)
            ->patchJson("/api/learning/roadmap-items/{$item->id}/progress", ['status' => 'completed'])
            ->assertForbidden();

        $this->assertDatabaseMissing('learning_progress', ['roadmap_item_id' => $item->id]);
    }

    public function test_contributor_can_update_own_progress_and_admin_can_update_any_progress(): void
    {
        $contributor = $this->user();
        $item = $this->itemFor($contributor);
        $admin = $this->user();
        DB::table('roles')->insert(['id' => (string) Str::uuid(), 'name' => 'admin', 'created_at' => now(), 'updated_at' => now()]);
        $adminRoleId = DB::table('roles')->where('name', 'admin')->value('id');
        DB::table('user_roles')->insert(['user_id' => $admin->id, 'role_id' => $adminRoleId, 'created_at' => now()]);

        $this->actingAs($contributor)
            ->patchJson("/api/learning/roadmap-items/{$item->id}/progress", ['status' => 'in_progress'])
            ->assertOk();
        $this->actingAs($admin)
            ->patchJson("/api/learning/roadmap-items/{$item->id}/progress", ['status' => 'completed'])
            ->assertOk()
            ->assertJsonPath('data.status', 'completed');
    }

    public function test_invalid_status_is_rejected_without_write(): void
    {
        $owner = $this->user();
        $item = $this->itemFor($owner);

        $this->actingAs($owner)
            ->patchJson("/api/learning/roadmap-items/{$item->id}/progress", ['status' => 'invalid'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('status');

        $this->assertDatabaseMissing('learning_progress', ['roadmap_item_id' => $item->id]);
    }

    public function test_retries_create_one_tracker_and_apply_timestamp_contract(): void
    {
        $owner = $this->user();
        $item = $this->itemFor($owner);

        $this->actingAs($owner)
            ->patchJson("/api/learning/roadmap-items/{$item->id}/progress", ['status' => 'in_progress'])
            ->assertOk();
        $first = LearningProgress::where('roadmap_item_id', $item->id)->firstOrFail();

        $this->actingAs($owner)
            ->patchJson("/api/learning/roadmap-items/{$item->id}/progress", ['status' => 'in_progress'])
            ->assertOk();
        $this->assertSame(1, LearningProgress::where('roadmap_item_id', $item->id)->count());
        $this->assertEquals($first->started_at, $first->fresh()->started_at);

        $this->actingAs($owner)
            ->patchJson("/api/learning/roadmap-items/{$item->id}/progress", ['status' => 'completed'])
            ->assertOk();
        $this->assertNotNull($first->fresh()->completed_at);

        $this->actingAs($owner)
            ->patchJson("/api/learning/roadmap-items/{$item->id}/progress", ['status' => 'pending'])
            ->assertOk();
        $this->assertNull($first->fresh()->completed_at);
        $this->assertSame('pending', $item->fresh()->status);
    }

    public function test_progress_is_isolated_per_roadmap_item(): void
    {
        $owner = $this->user();
        $itemA = $this->itemFor($owner);
        $itemB = $this->itemFor($owner, 2);

        app(RoadmapProgressService::class)->update($itemA, 'completed');

        $this->assertDatabaseHas('learning_progress', ['roadmap_item_id' => $itemA->id, 'status' => 'completed']);
        $this->assertDatabaseMissing('learning_progress', ['roadmap_item_id' => $itemB->id]);
    }

    public function test_deleting_item_cascades_progress(): void
    {
        $item = $this->itemFor($this->user());
        app(RoadmapProgressService::class)->update($item, 'completed');

        $item->delete();

        $this->assertDatabaseMissing('learning_progress', ['roadmap_item_id' => $item->id]);
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

    private function itemFor(User $owner, int $position = 1): RoadmapItem
    {
        $roadmap = LearningRoadmap::query()->create([
            'user_id' => $owner->id,
            'title' => 'Roadmap',
            'goal' => 'Learn safely',
            'status' => 'active',
        ]);

        return RoadmapItem::query()->create([
            'roadmap_id' => $roadmap->id,
            'title' => 'Item',
            'position' => $position,
            'status' => 'pending',
        ]);
    }
}