<?php

namespace Tests\Unit\AI;

use App\Services\AI\AIRoadmapService;
use Illuminate\Support\Facades\Http;
use Illuminate\Foundation\Testing\RefreshDatabase;
use RuntimeException;
use Tests\TestCase;

class AIRoadmapServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_generate_calls_private_ai_service_and_normalizes_output(): void
    {
        config(['services.ai.url' => 'https://ai.example', 'services.ai.token' => 'internal-secret']);
        Http::fake(['ai.example/*' => Http::response([
            'title' => 'Personalized path', 'summary' => 'Summary', 'items' => array_map(fn ($position) => [
                'position' => $position, 'title' => "Skill {$position}", 'description' => 'Practice it.', 'skills' => ['Python'],
            ], range(1, 4)), 'meta' => ['provider' => 'gemini', 'configured_model' => 'gemini-2.5-flash', 'model_version' => null],
        ])]);

        $draft = app(AIRoadmapService::class)->generate([
            'goal' => 'Build a personal finance app', 'level' => 'beginner', 'weeks' => 10,
            'hours_per_week' => 4, 'job_postings' => [],
        ]);

        Http::assertSent(fn ($request) => $request->header('X-Service-Token') === 'internal-secret'
            && $request['goal'] === 'Build a personal finance app');
        $this->assertSame('gemini', $draft['meta']['provider']);
        $this->assertSame(1, $draft['items'][0]['position']);
        $this->assertNull($draft['items'][0]['article_id']);
    }

    public function test_generate_rejects_malformed_service_output(): void
    {
        config(['services.ai.url' => 'https://ai.example', 'services.ai.token' => 'internal-secret']);
        Http::fake(['ai.example/*' => Http::response(['items' => 'not-an-array'])]);
        $this->expectException(RuntimeException::class);
        app(AIRoadmapService::class)->generate(['goal' => 'goal']);
    }

    public function test_provider_errors_are_classified_without_exposing_provider_body(): void
    {
        config(['services.ai.url' => 'https://ai.example', 'services.ai.token' => 'internal-secret']);
        Http::fake(['ai.example/*' => Http::response(['detail' => ['code' => 'provider_auth']], 502)]);
        try {
            app(AIRoadmapService::class)->generate(['goal' => 'goal']);
            $this->fail('Expected provider error.');
        } catch (RuntimeException $exception) {
            $this->assertSame(502, $exception->getCode());
            $this->assertStringNotContainsString('provider_auth', $exception->getMessage());
        }
    }
}
