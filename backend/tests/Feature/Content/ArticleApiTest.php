<?php

namespace Tests\Feature\Content;

use App\Models\Article;
use App\Models\Category;
use App\Models\Tag;
use App\Services\Content\ArticleService;
use App\Services\Content\TagService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ArticleApiTest extends TestCase
{
    use RefreshDatabase, ContentTestHelper;

    public function test_guest_can_list_published_articles(): void
    {
        $contributor = $this->createUserWithRole('contributor');
        $articleService = app(ArticleService::class);

        $article = $articleService->create([
            'title' => 'Getting Started with Laravel',
            'content' => 'Introductory course content.',
        ], $contributor);

        $articleService->publish($article);

        // Also create an unpublished draft
        $articleService->create([
            'title' => 'Secret Draft',
            'content' => 'WIP content.',
        ], $contributor);

        $response = $this->getJson('/api/v1/articles');

        $response->assertStatus(200)
            ->assertJsonStructure(['data', 'current_page', 'per_page', 'total']);

        $data = $response->json('data');
        $this->assertCount(1, $data);
        $this->assertEquals('Getting Started with Laravel', $data[0]['published_version']['title']);
    }

    public function test_guest_can_filter_articles_by_category_and_search(): void
    {
        $contributor = $this->createUserWithRole('contributor');
        $articleService = app(ArticleService::class);

        $category = Category::create(['name' => 'Architecture', 'slug' => 'architecture']);

        $article = $articleService->create([
            'title' => 'Domain Driven Design',
            'content' => 'Deep dive into DDD.',
            'category_id' => $category->id,
        ], $contributor);

        $articleService->publish($article);

        $response = $this->getJson('/api/v1/articles?category_slug=architecture');
        $response->assertStatus(200);
        $this->assertCount(1, $response->json('data'));

        $responseSearch = $this->getJson('/api/v1/articles?search=Domain');
        $responseSearch->assertStatus(200);
        $this->assertCount(1, $responseSearch->json('data'));

        $responseEmpty = $this->getJson('/api/v1/articles?search=NonExistent');
        $responseEmpty->assertStatus(200);
        $this->assertCount(0, $responseEmpty->json('data'));
    }

    public function test_guest_can_view_published_article_by_slug(): void
    {
        $contributor = $this->createUserWithRole('contributor');
        $articleService = app(ArticleService::class);

        $article = $articleService->create([
            'title' => 'Advanced Indexing in Postgres',
            'content' => 'B-Tree, GIN, and BRIN.',
        ], $contributor);

        $articleService->publish($article);

        $response = $this->getJson("/api/v1/articles/{$article->slug}");

        $response->assertStatus(200)
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.slug', $article->slug);
    }

    public function test_guest_cannot_view_draft_article(): void
    {
        $contributor = $this->createUserWithRole('contributor');
        $articleService = app(ArticleService::class);

        $article = $articleService->create([
            'title' => 'Draft Content',
            'content' => 'Not published yet.',
        ], $contributor);

        // Guest attempting to view draft receives 403 Forbidden
        $response = $this->getJson("/api/v1/articles/{$article->slug}");
        $response->assertStatus(403);
    }

    public function test_contributor_can_create_article_draft(): void
    {
        $contributor = $this->createUserWithRole('contributor');

        $response = $this->actingAs($contributor)->postJson('/api/v1/articles', [
            'title' => 'Microservices with RabbitMQ',
            'content' => 'Guide to event-driven architectures.',
            'tags' => ['microservices', 'rabbitmq'],
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.status', 'draft');

        $this->assertDatabaseHas('articles', [
            'status' => 'draft',
            'author_id' => $contributor->id,
        ]);
    }

    public function test_regular_user_cannot_create_article(): void
    {
        $user = $this->createUserWithRole('user');

        $response = $this->actingAs($user)->postJson('/api/v1/articles', [
            'title' => 'Unauthorized Post',
            'content' => 'Forbidden content creation attempt.',
        ]);

        $response->assertStatus(403);
    }

    public function test_contributor_can_create_new_version_and_publish_own_article(): void
    {
        $contributor = $this->createUserWithRole('contributor');
        $articleService = app(ArticleService::class);

        $article = $articleService->create([
            'title' => 'Event Sourcing Patterns',
            'content' => 'First edition.',
        ], $contributor);

        // Update creates version 2
        $updateResponse = $this->actingAs($contributor)->postJson("/api/v1/articles/{$article->id}/versions", [
            'title' => 'Event Sourcing Patterns v2',
            'content' => 'Updated edition with CQRS.',
        ]);

        $updateResponse->assertStatus(200)
            ->assertJsonPath('data.version_no', 2);

        // Publish article
        $publishResponse = $this->actingAs($contributor)->postJson("/api/v1/articles/{$article->id}/publish");

        $publishResponse->assertStatus(200)
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.status', 'published');

        $this->assertEquals('published', $article->fresh()->status);
    }

    public function test_contributor_cannot_edit_another_contributors_article(): void
    {
        $contributor1 = $this->createUserWithRole('contributor');
        $contributor2 = $this->createUserWithRole('contributor');
        $articleService = app(ArticleService::class);

        $article = $articleService->create([
            'title' => 'Contributor 1 Article',
            'content' => 'Content.',
        ], $contributor1);

        $response = $this->actingAs($contributor2)->postJson("/api/v1/articles/{$article->id}/versions", [
            'title' => 'Hacked Title',
            'content' => 'Hacked Content.',
        ]);

        $response->assertStatus(403);
    }

    public function test_cannot_publish_version_from_different_article(): void
    {
        $contributor = $this->createUserWithRole('contributor');
        $articleService = app(ArticleService::class);

        $article1 = $articleService->create([
            'title' => 'Article One',
            'content' => 'Content 1',
        ], $contributor);

        $article2 = $articleService->create([
            'title' => 'Article Two',
            'content' => 'Content 2',
        ], $contributor);

        $foreignVersion = $article2->versions->first();

        $response = $this->actingAs($contributor)->postJson("/api/v1/articles/{$article1->id}/publish", [
            'version_id' => $foreignVersion->id,
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('status', 'error')
            ->assertJsonPath('message', 'Cannot publish version: version does not belong to this article.');
    }

    public function test_admin_can_manage_any_article(): void
    {
        $contributor = $this->createUserWithRole('contributor');
        $admin = $this->createUserWithRole('admin');
        $articleService = app(ArticleService::class);

        $article = $articleService->create([
            'title' => 'Draft by Contributor',
            'content' => 'Content.',
        ], $contributor);

        // Admin publishes contributor's article
        $publishResponse = $this->actingAs($admin)->postJson("/api/v1/articles/{$article->id}/publish");
        $publishResponse->assertStatus(200);

        // Admin archives contributor's article
        $archiveResponse = $this->actingAs($admin)->postJson("/api/v1/articles/{$article->id}/archive");
        $archiveResponse->assertStatus(200);
        $this->assertEquals('archived', $article->fresh()->status);
    }

    public function test_contributor_can_soft_delete_own_article(): void
    {
        $contributor = $this->createUserWithRole('contributor');
        $articleService = app(ArticleService::class);

        $article = $articleService->create([
            'title' => 'Article to Delete',
            'content' => 'Content.',
        ], $contributor);

        $response = $this->actingAs($contributor)->deleteJson("/api/v1/articles/{$article->id}");
        $response->assertStatus(200);

        $this->assertSoftDeleted('articles', ['id' => $article->id]);
    }
}

