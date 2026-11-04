<?php

namespace Tests\Unit\AI;

use App\Services\AI\AIRoadmapService;
use Illuminate\Support\Facades\Http;
use RuntimeException;
use Tests\TestCase;

class AIRoadmapServiceTest extends TestCase
{
    private function payload(array $overrides = []): array
    {
        return array_replace_recursive([
            'title' => 'Data Engineer roadmap',
            'summary' => 'A practical path.',
            'items' => [[
                'position' => 1,
                'title' => 'SQL foundations',
                'description' => 'Learn relational querying.',
                'skills' => ['SQL'],
                'article_id' => null,
            ]],
        ], $overrides);
    }

    public function test_generate_normalizes_provider_response(): void
    {
        config(['services.gemini.api_key' => 'test-key', 'services.gemini.model' => 'test-model']);
        Http::fake(['generativelanguage.googleapis.com/*' => Http::response([
            'modelVersion' => 'gemini-test',
            'candidates' => [['content' => ['parts' => [['text' => json_encode($this->payload())]]]]],
        ])]);

        $result = app(AIRoadmapService::class)->generate([
            'goal' => 'Become a data engineer', 'level' => 'beginner', 'weeks' => 12, 'hours_per_week' => 8,
        ]);

        $this->assertSame('Data Engineer roadmap', $result['title']);
        $this->assertSame('gemini-test', $result['meta']['model_version']);
        $this->assertSame(1, $result['items'][0]['position']);
    }

    public function test_generate_rejects_invalid_json(): void
    {
        config(['services.gemini.api_key' => 'test-key']);
        Http::fake(['generativelanguage.googleapis.com/*' => Http::response([
            'candidates' => [['content' => ['parts' => [['text' => '{invalid']]]]]],
        ])]);

        $this->expectException(RuntimeException::class);
        $service = app(AIRoadmapService::class);
        $service->generate(['goal' => 'Goal', 'level' => 'beginner', 'weeks' => 1, 'hours_per_week' => 1]);
    }

    public function test_generate_rejects_blank_titles(): void
    {
        config(['services.gemini.api_key' => 'test-key']);
        Http::fake(['generativelanguage.googleapis.com/*' => Http::response([
            'candidates' => [['content' => ['parts' => [['text' => json_encode($this->payload(['title' => '  ']))]]]]],
        ])]);

        $this->expectException(RuntimeException::class);
        $service = app(AIRoadmapService::class);
        $service->generate(['goal' => 'Goal', 'level' => 'beginner', 'weeks' => 1, 'hours_per_week' => 1]);
    }

    public function test_generate_wraps_provider_errors(): void
    {
        config(['services.gemini.api_key' => 'test-key']);
        Http::fake(['generativelanguage.googleapis.com/*' => Http::response(['error' => 'down'], 500)]);

        $this->expectExceptionMessage('Gemini request failed.');
        app(AIRoadmapService::class)->generate(['goal' => 'Goal', 'level' => 'beginner', 'weeks' => 1, 'hours_per_week' => 1]);
    }
}
