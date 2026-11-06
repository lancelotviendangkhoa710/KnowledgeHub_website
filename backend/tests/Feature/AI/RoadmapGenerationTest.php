<?php

namespace Tests\Feature\AI;

use App\Models\User;
use App\Models\RoadmapItem;
use App\Services\AI\AIRoadmapConfirmationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class RoadmapGenerationTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_user_can_preview_a_roadmap(): void
    {
        config(['services.ai.url' => 'https://ai.example', 'services.ai.token' => 'internal-secret']);
        Http::fake(['ai.example/*' => Http::response([
            'title' => 'Roadmap', 'summary' => 'Summary', 'items' => array_map(static fn ($position) => [
                'position' => $position, 'title' => "Step {$position}", 'description' => 'Description', 'skills' => ['SQL'],
            ], range(1, 4)),
        ])]);
        Sanctum::actingAs($this->createUser());

        $this->postJson('/api/ai/roadmaps/preview', [
            'goal' => 'Become a data engineer', 'level' => 'beginner', 'weeks' => 12, 'hours_per_week' => 8,
            'job_postings' => ['Seeking experience with Spark and Airflow'],
        ])->assertOk()->assertJsonPath('status', 'success')->assertJsonPath('data.items.0.article_id', null);
    }

    public function test_guest_is_rejected_and_invalid_input_is_validated(): void
    {
        $this->postJson('/api/ai/roadmaps/preview', [])->assertUnauthorized();
        Sanctum::actingAs($this->createUser());

        $this->postJson('/api/ai/roadmaps/preview', [
            'goal' => '', 'level' => 'unknown', 'weeks' => 0, 'hours_per_week' => 0, 'job_postings' => [str_repeat('x', 6_000)],
        ])->assertUnprocessable()->assertJsonValidationErrors(['goal', 'level', 'weeks', 'hours_per_week', 'job_postings.0']);
    }

    /** Reject job postings whose combined text exceeds the API limit. */
    public function test_preview_validates_combined_job_posting_length(): void
    {
        Sanctum::actingAs($this->createUser());
        $this->postJson('/api/ai/roadmaps/preview', [
            'goal' => 'Become a data engineer', 'level' => 'beginner', 'weeks' => 12, 'hours_per_week' => 8,
            'job_postings' => array_fill(0, 4, str_repeat('x', 4000)),
        ])->assertUnprocessable()->assertJsonValidationErrors(['job_postings']);
    }

    /** Ensure an authenticated user can persist a complete AI-generated roadmap. */
    public function test_confirm_atomically_saves_roadmap_and_items_for_authenticated_user(): void
    {
        $user = $this->createUser();
        Sanctum::actingAs($user);
        $items = [];
        for ($position = 1; $position <= 4; $position++) {
            $items[] = ['position' => $position, 'title' => "Step {$position}", 'description' => 'Practice.', 'skills' => ['SQL']];
        }

        $this->postJson('/api/ai/roadmaps/confirm', [
            'goal' => 'Prepare for a data role', 'title' => 'Personal plan', 'summary' => 'Summary', 'items' => $items,
            'user_id' => (string) Str::uuid(),
        ])->assertCreated()->assertJsonPath('data.user_id', $user->id)->assertJsonCount(4, 'data.items');
        $this->assertDatabaseHas('learning_roadmaps', ['user_id' => $user->id, 'goal' => 'Prepare for a data role']);
        $this->assertDatabaseHas('roadmap_items', ['description' => "Practice.\nSkills: SQL"]);
        $this->assertDatabaseCount('roadmap_items', 4);
    }

    /** Reject non-sequential positions before any roadmap rows are written. */
    public function test_confirm_rejects_nonsequential_item_positions(): void
    {
        Sanctum::actingAs($this->createUser());
        $items = [];
        for ($position = 1; $position <= 4; $position++) {
            $items[] = ['position' => $position, 'title' => "Step {$position}", 'description' => 'Practice.', 'skills' => []];
        }
        $items[2]['position'] = 8;
        $this->postJson('/api/ai/roadmaps/confirm', [
            'goal' => 'Prepare for a data role', 'title' => 'Personal plan', 'summary' => 'Summary', 'items' => $items,
        ])->assertUnprocessable()->assertJsonValidationErrors(['items']);
        $this->assertDatabaseCount('learning_roadmaps', 0);
        $this->assertDatabaseCount('roadmap_items', 0);
    }

    /** Persist an item with empty skills because the preview may contain no listed skills. */
    public function test_confirm_accepts_present_empty_skills_arrays(): void
    {
        Sanctum::actingAs($this->createUser());
        $items = array_map(static fn ($position) => [
            'position' => $position, 'title' => "Step {$position}", 'description' => 'Practice.', 'skills' => [],
        ], range(1, 4));

        $this->postJson('/api/ai/roadmaps/confirm', [
            'goal' => 'Prepare for a data role', 'title' => 'Personal plan', 'summary' => 'Summary', 'items' => $items,
        ])->assertCreated();
        $this->assertDatabaseHas('roadmap_items', ['title' => 'Step 1', 'description' => 'Practice.']);
    }

    /** Ensure a failure after the first insert rolls back the roadmap and every item. */
    public function test_confirmation_service_rolls_back_when_item_creation_fails(): void
    {
        $user = $this->createUser();
        $items = array_map(static fn ($position) => [
            'position' => $position, 'title' => "Step {$position}", 'description' => 'Practice.', 'skills' => ['SQL'],
        ], range(1, 4));
        $created = 0;
        RoadmapItem::creating(static function () use (&$created): void {
            $created++;
            if ($created === 2) {
                throw new \RuntimeException('Simulated item insert failure.');
            }
        });

        try {
            app(AIRoadmapConfirmationService::class)->save($user, [
                'goal' => 'Prepare for a data role', 'title' => 'Personal plan', 'items' => $items,
            ]);
            $this->fail('Expected item creation to fail.');
        } catch (\RuntimeException $exception) {
            $this->assertSame('Simulated item insert failure.', $exception->getMessage());
        }

        $this->assertDatabaseCount('learning_roadmaps', 0);
        $this->assertDatabaseCount('roadmap_items', 0);
    }

    public function test_guest_cannot_confirm_and_admin_is_exempt_from_preview_limiter(): void
    {
        $draftResponse = ['title' => 'Roadmap', 'summary' => 'Summary', 'items' => array_map(static fn ($position) => [
            'position' => $position, 'title' => "Step {$position}", 'description' => 'Description', 'skills' => [],
        ], range(1, 4))];
        Http::fake(['ai.example/*' => Http::response($draftResponse)]);
        $this->postJson('/api/ai/roadmaps/confirm', [])->assertUnauthorized();

        $admin = $this->createUser();
        $this->assignRole($admin, 'admin');
        Sanctum::actingAs($admin);
        config(['services.ai.url' => 'https://ai.example', 'services.ai.token' => 'internal-secret']);

        for ($attempt = 0; $attempt < 11; $attempt++) {
            $this->postJson('/api/ai/roadmaps/preview', [
                'goal' => 'A clear learning goal', 'level' => 'beginner', 'weeks' => 6, 'hours_per_week' => 4,
            ])->assertOk();
        }
    }

    public function test_regular_user_is_limited_after_ten_previews(): void
    {
        config(['services.ai.url' => 'https://ai.example', 'services.ai.token' => 'internal-secret']);
        Http::fake(['ai.example/*' => Http::response([
            'title' => 'Roadmap', 'summary' => 'Summary', 'items' => array_map(static fn ($position) => [
                'position' => $position, 'title' => "Step {$position}", 'description' => 'Description', 'skills' => [],
            ], range(1, 4)),
        ])]);
        $user = $this->createUser();
        Sanctum::actingAs($user);
        $payload = ['goal' => 'A clear learning goal', 'level' => 'beginner', 'weeks' => 6, 'hours_per_week' => 4];

        for ($attempt = 0; $attempt < 10; $attempt++) {
            $this->postJson('/api/ai/roadmaps/preview', $payload)->assertOk();
        }
        $this->postJson('/api/ai/roadmaps/preview', $payload)->assertTooManyRequests();
    }

    public function test_contributor_confirmation_is_still_owned_by_the_authenticated_user(): void
    {
        $contributor = $this->createUser();
        $this->assignRole($contributor, 'contributor');
        Sanctum::actingAs($contributor);
        $items = array_map(static fn ($position) => [
            'position' => $position, 'title' => "Step {$position}", 'description' => 'Practice.', 'skills' => ['SQL'],
        ], range(1, 4));

        $this->postJson('/api/ai/roadmaps/confirm', [
            'goal' => 'Learn a skill', 'title' => 'A personal plan', 'summary' => 'Summary', 'items' => $items,
        ])->assertCreated()->assertJsonPath('data.user_id', $contributor->id);
    }

    private function assignRole(User $user, string $name): void
    {
        $roleId = DB::table('roles')->where('name', $name)->value('id');
        if (! $roleId) {
            $roleId = (string) Str::uuid();
            DB::table('roles')->insert(['id' => $roleId, 'name' => $name, 'created_at' => now(), 'updated_at' => now()]);
        }
        DB::table('user_roles')->insert(['user_id' => $user->id, 'role_id' => $roleId, 'created_at' => now()]);
    }

    private function createUser(): User
    {
        return User::query()->create([
            'name' => 'Roadmap user',
            'email' => 'roadmap-'.Str::uuid().'@example.test',
            'password' => 'password',
        ]);
    }
}
