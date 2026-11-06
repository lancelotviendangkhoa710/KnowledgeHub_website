<?php

namespace Tests\Feature\AI;

use App\Models\User;
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
        Sanctum::actingAs(User::factory()->create());

        $this->postJson('/api/ai/roadmaps/preview', [
            'goal' => 'Become a data engineer', 'level' => 'beginner', 'weeks' => 12, 'hours_per_week' => 8,
            'job_postings' => ['Seeking experience with Spark and Airflow'],
        ])->assertOk()->assertJsonPath('status', 'success')->assertJsonPath('data.items.0.article_id', null);
    }

    public function test_guest_is_rejected_and_invalid_input_is_validated(): void
    {
        $this->postJson('/api/ai/roadmaps/preview', [])->assertUnauthorized();
        Sanctum::actingAs(User::factory()->create());

        $this->postJson('/api/ai/roadmaps/preview', [
            'goal' => '', 'level' => 'unknown', 'weeks' => 0, 'hours_per_week' => 0, 'job_postings' => [str_repeat('x', 6_000)],
        ])->assertUnprocessable()->assertJsonValidationErrors(['goal', 'level', 'weeks', 'hours_per_week', 'job_postings.0']);
    }

    public function test_confirm_atomically_saves_roadmap_and_items_for_authenticated_user(): void
    {
        $user = User::factory()->create();
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

    public function test_confirm_rolls_back_all_rows_for_nonsequential_or_untrusted_item_positions(): void
    {
        Sanctum::actingAs(User::factory()->create());
        $items = [];
        for ($position = 1; $position <= 4; $position++) {
            $items[] = ['position' => $position, 'title' => "Step {$position}", 'description' => 'Practice.', 'skills' => []];
        }
        $items[2]['position'] = 8;
        $this->postJson('/api/ai/roadmaps/confirm', [
            'goal' => 'Prepare for a data role', 'title' => 'Personal plan', 'summary' => 'Summary', 'items' => $items,
        ])->assertUnprocessable();
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

        $admin = User::factory()->create();
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
        $user = User::factory()->create();
        Sanctum::actingAs($user);
        $payload = ['goal' => 'A clear learning goal', 'level' => 'beginner', 'weeks' => 6, 'hours_per_week' => 4];

        for ($attempt = 0; $attempt < 10; $attempt++) {
            $this->postJson('/api/ai/roadmaps/preview', $payload)->assertOk();
        }
        $this->postJson('/api/ai/roadmaps/preview', $payload)->assertTooManyRequests();
    }

    public function test_contributor_confirmation_is_still_owned_by_the_authenticated_user(): void
    {
        $contributor = User::factory()->create();
        $this->assignRole($contributor, 'contributor');
        Sanctum::actingAs($contributor);
        $items = array_map(static fn ($position) => [
            'position' => $position, 'title' => "Step {$position}", 'description' => 'Practice.', 'skills' => [],
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
}
