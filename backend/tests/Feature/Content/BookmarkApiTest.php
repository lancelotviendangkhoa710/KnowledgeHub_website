<?php

namespace Tests\Feature\Content;

use App\Services\Content\ArticleService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class BookmarkApiTest extends TestCase
{
    use RefreshDatabase, ContentTestHelper;

    public function test_guest_cannot_list_bookmarks(): void
    {
        $this->getJson('/api/v1/bookmarks')->assertUnauthorized();
    }

    public function test_guest_cannot_bookmark_article(): void
    {
        $this->postJson('/api/v1/articles/some-id/bookmark')->assertUnauthorized();
    }

    public function test_sanctum_authenticated_user_can_list_bookmarks(): void
    {
        $user = $this->createUserWithRole('user');
        Sanctum::actingAs($user);

        $this->getJson('/api/v1/bookmarks')
            ->assertOk()
            ->assertJsonCount(0, 'data');
    }

    public function test_bearer_token_can_list_bookmark_and_unbookmark_article(): void
    {
        $user = $this->createUserWithRole('user');
        $contributor = $this->createUserWithRole('contributor');
        $articleService = app(ArticleService::class);

        $article = $articleService->create([
            'title' => 'Bearer Token Bookmark Article',
            'content' => 'Content here.',
        ], $contributor);

        $articleService->publish($article);

        $token = $user->createToken('bookmark-api-test')->plainTextToken;

        $this->withHeader('Authorization', "Bearer {$token}");

        // Regression: Bearer tokens must be accepted by the content routes.
        $this->getJson('/api/v1/bookmarks')
            ->assertOk()
            ->assertJsonCount(0, 'data');

        $this->postJson("/api/v1/articles/{$article->id}/bookmark")
            ->assertStatus(201)
            ->assertJsonPath('status', 'success');

        $this->assertDatabaseHas('bookmarks', [
            'user_id' => $user->id,
            'article_id' => $article->id,
        ]);

        $this->getJson('/api/v1/bookmarks')
            ->assertOk()
            ->assertJsonCount(1, 'data');

        $this->deleteJson("/api/v1/articles/{$article->id}/bookmark")
            ->assertStatus(200)
            ->assertJsonPath('status', 'success');

        $this->assertDatabaseMissing('bookmarks', [
            'user_id' => $user->id,
            'article_id' => $article->id,
        ]);
    }

    public function test_user_can_bookmark_and_unbookmark_published_article(): void
    {
        $user = $this->createUserWithRole('user');
        $contributor = $this->createUserWithRole('contributor');
        $articleService = app(ArticleService::class);

        $article = $articleService->create([
            'title' => 'Useful Architecture Article',
            'content' => 'Content here.',
        ], $contributor);

        $articleService->publish($article);

        Sanctum::actingAs($user);

        // Bookmark
        $bookmarkResponse = $this->postJson("/api/v1/articles/{$article->id}/bookmark");
        $bookmarkResponse->assertStatus(201)
            ->assertJsonPath('status', 'success');

        $this->assertDatabaseHas('bookmarks', [
            'user_id' => $user->id,
            'article_id' => $article->id,
        ]);

        // List Bookmarks
        $listResponse = $this->getJson('/api/v1/bookmarks');
        $listResponse->assertStatus(200);
        $this->assertCount(1, $listResponse->json('data'));

        // Unbookmark
        $unbookmarkResponse = $this->deleteJson("/api/v1/articles/{$article->id}/bookmark");
        $unbookmarkResponse->assertStatus(200);

        $this->assertDatabaseMissing('bookmarks', [
            'user_id' => $user->id,
            'article_id' => $article->id,
        ]);
    }

    public function test_cannot_bookmark_unpublished_article(): void
    {
        $user = $this->createUserWithRole('user');
        $contributor = $this->createUserWithRole('contributor');
        $articleService = app(ArticleService::class);

        $draft = $articleService->create([
            'title' => 'Unpublished Draft',
            'content' => 'Content here.',
        ], $contributor);

        Sanctum::actingAs($user);

        $response = $this->postJson("/api/v1/articles/{$draft->id}/bookmark");
        $response->assertStatus(404);
    }
}

