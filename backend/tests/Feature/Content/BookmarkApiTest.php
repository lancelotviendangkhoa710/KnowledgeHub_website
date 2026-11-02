<?php

namespace Tests\Feature\Content;

use App\Models\Article;
use App\Services\Content\ArticleService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BookmarkApiTest extends TestCase
{
    use RefreshDatabase, ContentTestHelper;

    public function test_guest_cannot_bookmark_article(): void
    {
        $response = $this->postJson('/api/v1/articles/some-id/bookmark');
        $response->assertStatus(401);
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

        // Bookmark
        $bookmarkResponse = $this->actingAs($user)->postJson("/api/v1/articles/{$article->id}/bookmark");
        $bookmarkResponse->assertStatus(201)
            ->assertJsonPath('status', 'success');

        $this->assertDatabaseHas('bookmarks', [
            'user_id' => $user->id,
            'article_id' => $article->id,
        ]);

        // List Bookmarks
        $listResponse = $this->actingAs($user)->getJson('/api/v1/bookmarks');
        $listResponse->assertStatus(200);
        $this->assertCount(1, $listResponse->json('data'));

        // Unbookmark
        $unbookmarkResponse = $this->actingAs($user)->deleteJson("/api/v1/articles/{$article->id}/bookmark");
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

        $response = $this->actingAs($user)->postJson("/api/v1/articles/{$draft->id}/bookmark");
        $response->assertStatus(404);
    }
}

