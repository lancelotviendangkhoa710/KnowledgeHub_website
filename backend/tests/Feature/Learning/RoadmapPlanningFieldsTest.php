<?php

namespace Tests\Feature\Learning;

use App\Models\LearningRoadmap;
use App\Models\RoadmapItem;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/** LRN-DB-01 / LRN-BE-01..04: level, duration, visibility, template source and per-step planning fields. */
class RoadmapPlanningFieldsTest extends TestCase
{
    use RefreshDatabase;

    public function test_owner_saves_roadmap_planning_fields_and_visibility_defaults_to_private(): void
    {
        Sanctum::actingAs($this->user());

        $this->postJson('/api/learning/roadmaps', [
            'title' => 'Data Engineer — Foundation',
            'goal' => 'Build a first data pipeline',
            'level' => 'beginner',
            'duration_weeks' => 10,
            'source_template' => 'data-engineer-foundation',
        ])->assertCreated()
            ->assertJsonPath('data.level', 'beginner')
            ->assertJsonPath('data.duration_weeks', 10)
            ->assertJsonPath('data.source_template', 'data-engineer-foundation');

        $this->assertDatabaseHas('learning_roadmaps', [
            'title' => 'Data Engineer — Foundation', 'level' => 'beginner', 'duration_weeks' => 10, 'visibility' => 'private',
        ]);
    }

    public function test_level_and_duration_are_optional_and_can_be_cleared(): void
    {
        $owner = $this->user();
        $roadmap = LearningRoadmap::query()->create([
            'user_id' => $owner->id, 'title' => 'Plan', 'goal' => 'Learn', 'status' => 'active', 'level' => 'advanced', 'duration_weeks' => 8,
        ]);
        Sanctum::actingAs($owner);

        $this->postJson('/api/learning/roadmaps', ['title' => 'No level', 'goal' => 'Learn'])
            ->assertCreated()->assertJsonPath('data.level', null);

        $this->putJson("/api/learning/roadmaps/{$roadmap->id}", ['level' => null, 'duration_weeks' => null])->assertOk();
        $this->assertDatabaseHas('learning_roadmaps', ['id' => $roadmap->id, 'level' => null, 'duration_weeks' => null]);
    }

    public function test_invalid_roadmap_fields_are_rejected(): void
    {
        Sanctum::actingAs($this->user());

        $this->postJson('/api/learning/roadmaps', [
            'title' => 'Plan', 'goal' => 'Learn', 'level' => 'expert', 'duration_weeks' => 0,
            'visibility' => 'public', 'source_template' => 'Not A Slug!',
        ])->assertUnprocessable()->assertJsonValidationErrors(['level', 'duration_weeks', 'visibility', 'source_template']);

        $this->postJson('/api/learning/roadmaps', ['title' => 'Plan', 'goal' => 'Learn', 'duration_weeks' => 105])
            ->assertUnprocessable()->assertJsonValidationErrors(['duration_weeks']);
    }

    public function test_steps_store_and_update_hours_importance_and_note(): void
    {
        $owner = $this->user();
        $roadmap = $this->roadmapFor($owner, 'Plan');
        Sanctum::actingAs($owner);

        $itemId = $this->postJson("/api/learning/roadmaps/{$roadmap->id}/items", [
            'title' => 'SQL', 'position' => 1, 'study_hours' => 10.5, 'importance' => 90, 'note' => 'Do every exercise.',
        ])->assertCreated()->json('data.id');

        $this->assertDatabaseHas('roadmap_items', ['id' => $itemId, 'importance' => 90, 'note' => 'Do every exercise.']);
        $this->assertSame(10.5, (float) RoadmapItem::query()->find($itemId)->study_hours);

        $this->putJson("/api/learning/roadmaps/{$roadmap->id}/items/{$itemId}", ['importance' => 40, 'study_hours' => null, 'note' => null])
            ->assertOk();
        $this->assertDatabaseHas('roadmap_items', ['id' => $itemId, 'importance' => 40, 'study_hours' => null, 'note' => null]);
    }

    public function test_invalid_step_fields_are_rejected(): void
    {
        $owner = $this->user();
        $roadmap = $this->roadmapFor($owner, 'Plan');
        Sanctum::actingAs($owner);

        $this->postJson("/api/learning/roadmaps/{$roadmap->id}/items", [
            'title' => 'SQL', 'position' => 1, 'study_hours' => 0, 'importance' => 101, 'note' => str_repeat('a', 1001),
        ])->assertUnprocessable()->assertJsonValidationErrors(['study_hours', 'importance', 'note']);

        $this->postJson("/api/learning/roadmaps/{$roadmap->id}/items", ['title' => 'SQL', 'position' => 1, 'study_hours' => 1.25])
            ->assertUnprocessable()->assertJsonValidationErrors(['study_hours']);
    }

    public function test_list_filters_by_search_and_level_and_never_returns_other_users_roadmaps(): void
    {
        $owner = $this->user();
        $this->roadmapFor($owner, 'Backend Laravel', ['level' => 'intermediate']);
        $this->roadmapFor($owner, 'Data pipelines', ['level' => 'beginner', 'goal' => 'Learn SQL and Python']);
        $this->roadmapFor($this->user(), 'Laravel for someone else', ['level' => 'intermediate']);
        Sanctum::actingAs($owner);

        $this->getJson('/api/learning/roadmaps?q=laravel')
            ->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.title', 'Backend Laravel');

        $this->getJson('/api/learning/roadmaps?q=sql')
            ->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.title', 'Data pipelines');

        $this->getJson('/api/learning/roadmaps?level=beginner')
            ->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.title', 'Data pipelines');

        $this->getJson('/api/learning/roadmaps?sort=title')
            ->assertOk()->assertJsonPath('data.0.title', 'Backend Laravel')->assertJsonPath('data.1.title', 'Data pipelines');

        $this->getJson('/api/learning/roadmaps?q=100%25')->assertOk()->assertJsonCount(0, 'data');
        $this->getJson('/api/learning/roadmaps?level=expert')->assertUnprocessable();
    }

    public function test_ai_confirm_saves_level_and_weeks(): void
    {
        $user = $this->user();
        Sanctum::actingAs($user);
        $items = array_map(static fn ($position) => [
            'position' => $position, 'title' => "Step {$position}", 'description' => 'Practice.', 'skills' => [],
        ], range(1, 4));

        $this->postJson('/api/ai/roadmaps/confirm', [
            'goal' => 'Prepare for a data role', 'title' => 'Personal plan', 'summary' => 'Summary', 'items' => $items,
            'level' => 'intermediate', 'weeks' => 12,
        ])->assertCreated();

        $this->assertDatabaseHas('learning_roadmaps', ['user_id' => $user->id, 'level' => 'intermediate', 'duration_weeks' => 12]);
    }

    private function user(): User
    {
        $user = new User(['name' => 'Planner', 'email' => fake()->unique()->safeEmail(), 'password' => 'password', 'status' => 'active']);
        $user->id = (string) Str::uuid();
        $user->save();

        return $user;
    }

    private function roadmapFor(User $user, string $title, array $extra = []): LearningRoadmap
    {
        return LearningRoadmap::query()->create(['user_id' => $user->id, 'title' => $title, 'goal' => 'Learn safely', 'status' => 'active', ...$extra]);
    }
}
