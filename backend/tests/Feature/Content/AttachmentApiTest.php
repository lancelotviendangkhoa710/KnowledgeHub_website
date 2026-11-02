<?php

namespace Tests\Feature\Content;

use App\Models\Article;
use App\Services\Content\ArticleService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AttachmentApiTest extends TestCase
{
    use RefreshDatabase, ContentTestHelper;

    public function test_contributor_can_add_attachment_metadata_to_own_article_version(): void
    {
        $contributor = $this->createUserWithRole('contributor');
        $articleService = app(ArticleService::class);

        $article = $articleService->create([
            'title' => 'Article with Slides',
            'content' => 'Please download the attached slides.',
        ], $contributor);

        $version = $article->versions->first();

        $response = $this->actingAs($contributor)->postJson("/api/v1/versions/{$version->id}/attachments", [
            'object_key' => 'articles/slides-2026.pdf',
            'file_name' => 'slides-2026.pdf',
            'mime_type' => 'application/pdf',
            'size_bytes' => 1048576,
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.object_key', 'articles/slides-2026.pdf');

        $this->assertDatabaseHas('article_attachments', [
            'article_version_id' => $version->id,
            'object_key' => 'articles/slides-2026.pdf',
        ]);

        // List attachments
        $listResponse = $this->getJson("/api/v1/versions/{$version->id}/attachments");
        $listResponse->assertStatus(200);
        $this->assertCount(1, $listResponse->json('data'));

        // Delete attachment
        $attachmentId = $response->json('data.id');
        $deleteResponse = $this->actingAs($contributor)->deleteJson("/api/v1/attachments/{$attachmentId}");
        $deleteResponse->assertStatus(200);

        $this->assertDatabaseMissing('article_attachments', ['id' => $attachmentId]);
    }

    public function test_non_author_contributor_cannot_add_attachment_to_another_article(): void
    {
        $contributor1 = $this->createUserWithRole('contributor');
        $contributor2 = $this->createUserWithRole('contributor');
        $articleService = app(ArticleService::class);

        $article = $articleService->create([
            'title' => 'Article One',
            'content' => 'Content.',
        ], $contributor1);

        $version = $article->versions->first();

        $response = $this->actingAs($contributor2)->postJson("/api/v1/versions/{$version->id}/attachments", [
            'object_key' => 'articles/hack.pdf',
            'file_name' => 'hack.pdf',
            'mime_type' => 'application/pdf',
            'size_bytes' => 1024,
        ]);

        $response->assertStatus(403);
    }
}

