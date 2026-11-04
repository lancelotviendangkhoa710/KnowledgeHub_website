<?php

namespace Tests\Feature\AI;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class RoadmapGenerationTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_user_can_preview_a_roadmap(): void
    {
        config(['services.gemini.api_key' => 'test-key']);
        Http::fake(['generativelanguage.googleapis.com/*' => Http::response([
            'candidates' => [['content' => ['parts' => [['text' => json_encode([
                'title' => 'Roadmap', 'summary' => 'Summary', 'items' => [[
                    'title' => 'Step', 'description' => 'Description', 'skills' => ['SQL'], 'article_id' => null,
                ]],
            ])]]]],
        ])]);
        Sanctum::actingAs(User::factory()->create());

        $this->postJson('/api/ai/roadmaps/preview', [
            'goal' => 'Become a data engineer', 'level' => 'beginner', 'weeks' => 12, 'hours_per_week' => 8,
        ])->assertOk()->assertJsonPath('status', 'success')->assertJsonPath('data.items.0.article_id', null);
    }

    public function test_guest_is_rejected_and_invalid_input_is_validated(): void
    {
        $this->postJson('/api/ai/roadmaps/preview', [])->assertUnauthorized();
        Sanctum::actingAs(User::factory()->create());

        $this->postJson('/api/ai/roadmaps/preview', [
            'goal' => '', 'level' => 'unknown', 'weeks' => 0, 'hours_per_week' => 0,
        ])->assertUnprocessable()->assertJsonValidationErrors(['goal', 'level', 'weeks', 'hours_per_week']);
    }
}
