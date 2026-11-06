<?php

namespace Tests\Unit\AI;

use App\Models\Article;
use App\Models\ArticleVersion;
use App\Models\User;
use App\Services\AI\AIRoadmapService;
use Illuminate\Support\Facades\Http;
use Illuminate\Foundation\Testing\RefreshDatabase;
use RuntimeException;
use Illuminate\Support\Str;
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

        Http::assertSent(fn ($request) => $request->header('X-Service-Token') === ['internal-secret']
            && $request['goal'] === 'Build a personal finance app');
        $this->assertSame('gemini', $draft['meta']['provider']);
        $this->assertSame(1, $draft['items'][0]['position']);
        $this->assertNull($draft['items'][0]['article_id']);
    }

    /** Send only published, non-deleted catalog entries to the private AI service. */
    public function test_generate_filters_catalog_to_published_articles_only(): void
    {
        config(['services.ai.url' => 'https://ai.example', 'services.ai.token' => 'internal-secret']);
        Http::fake(['ai.example/*' => Http::response([
            'title' => 'Personalized path', 'summary' => 'Summary', 'items' => array_map(fn ($position) => [
                'position' => $position, 'title' => "Skill {$position}", 'description' => 'Practice it.', 'skills' => [],
            ], range(1, 4)),
        ])]);

        $published = $this->createCatalogArticle('published', 'Published catalog item');
        $this->createCatalogArticle('draft', 'Draft catalog item');
        $this->createCatalogArticle('archived', 'Archived catalog item');
        $deleted = $this->createCatalogArticle('published', 'Deleted catalog item');
        Article::query()->findOrFail($deleted)->delete();

        app(AIRoadmapService::class)->generate([
            'goal' => 'Learn data engineering', 'level' => 'beginner', 'weeks' => 10,
            'hours_per_week' => 4, 'job_postings' => [],
        ]);

        Http::assertSent(static fn ($request): bool => $request['catalog'] === [[
            'id' => $published, 'title' => 'Published catalog item',
        ]]);
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
        Http::fake(['ai.example/*' => Http::response(['detail' => ['code' => 'unauthorized']], 401)]);
        try {
            app(AIRoadmapService::class)->generate(['goal' => 'goal']);
            $this->fail('Expected provider error.');
        } catch (RuntimeException $exception) {
            $this->assertSame(503, $exception->getCode());
            $this->assertStringNotContainsString('unauthorized', $exception->getMessage());
        }
    }

    /** Create an article fixture with a version when it is published. */
    private function createCatalogArticle(string $status, string $title): string
    {
        $user = User::query()->create([
            'name' => 'Catalog author', 'email' => Str::uuid().'@example.test', 'password' => 'password',
        ]);
        $article = Article::query()->create([
            'author_id' => $user->id, 'slug' => Str::slug($title).'-'.Str::uuid(), 'status' => $status,
        ]);

        if ($status === 'published') {
            $version = ArticleVersion::query()->create([
                'article_id' => $article->id, 'version_no' => 1, 'title' => $title,
                'content' => 'Catalog fixture content.', 'created_by' => $user->id,
            ]);
            $article->update(['published_version_id' => $version->id]);
        }

        return $article->id;
    }
}
