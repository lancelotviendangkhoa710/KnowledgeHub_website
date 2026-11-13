<?php

namespace Tests\Feature\Content;

use App\Models\Article;
use App\Models\User;
use App\Services\Content\ArticleAttachmentService;
use App\Services\Content\ArticleService;
use App\Services\Content\BookmarkService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ArticleVersionVisibilityTest extends TestCase
{
    use RefreshDatabase, ContentTestHelper;

    /**
     * Published article (v1 published) with a newer unpublished revision (v2).
     */
    protected function publishedArticleWithRevision(User $author): Article
    {
        $articleService = app(ArticleService::class);

        $article = $articleService->create([
            'title' => 'Visible Course',
            'content' => 'Published content.',
        ], $author);

        $article = $articleService->publish($article);

        $articleService->createVersion($article, [
            'title' => 'Visible Course (revision)',
            'content' => 'Unpublished revision content.',
        ], $author);

        return $article->fresh();
    }

    /**
     * Never-published draft with two versions.
     */
    protected function draftWithTwoVersions(User $author): Article
    {
        $articleService = app(ArticleService::class);

        $article = $articleService->create([
            'title' => 'Draft Course',
            'content' => 'Draft content v1.',
        ], $author);

        $articleService->createVersion($article, [
            'title' => 'Draft Course v2',
            'content' => 'Draft content v2.',
        ], $author);

        return $article->fresh();
    }

    protected function bearer(User $user): string
    {
        return 'Bearer ' . $user->createToken('article-visibility-test')->plainTextToken;
    }

    public function test_guest_sees_only_published_version_and_no_email(): void
    {
        $author = $this->createUserWithRole('contributor');
        $article = $this->publishedArticleWithRevision($author);

        $versions = $this->getJson("/api/v1/articles/{$article->id}/versions");
        $versions->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $article->published_version_id)
            ->assertJsonPath('data.0.creator.name', $author->name)
            ->assertJsonMissingPath('data.0.creator.email');
        $this->assertStringNotContainsString($author->email, $versions->getContent());
        $this->assertStringNotContainsString('Unpublished revision content.', $versions->getContent());

        $showById = $this->getJson("/api/v1/articles/{$article->id}");
        $showById->assertOk()
            ->assertJsonCount(1, 'data.versions')
            ->assertJsonPath('data.versions.0.id', $article->published_version_id)
            ->assertJsonMissingPath('data.author.email');
        $this->assertStringNotContainsString($author->email, $showById->getContent());
        $this->assertStringNotContainsString('Unpublished revision content.', $showById->getContent());

        $showBySlug = $this->getJson("/api/v1/articles/{$article->slug}");
        $showBySlug->assertOk()
            ->assertJsonPath('data.author.name', $author->name)
            ->assertJsonMissingPath('data.author.email');
        $this->assertStringNotContainsString($author->email, $showBySlug->getContent());

        $list = $this->getJson('/api/v1/articles');
        $list->assertOk();
        $this->assertStringNotContainsString($author->email, $list->getContent());
    }

    public function test_other_reader_with_bearer_sees_only_published_version(): void
    {
        $author = $this->createUserWithRole('contributor');
        $reader = $this->createUserWithRole('user');
        $article = $this->publishedArticleWithRevision($author);

        $this->withHeader('Authorization', $this->bearer($reader))
            ->getJson("/api/v1/articles/{$article->id}/versions")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $article->published_version_id);
    }

    public function test_author_with_bearer_sees_all_versions_of_own_draft(): void
    {
        $author = $this->createUserWithRole('contributor');
        $article = $this->draftWithTwoVersions($author);

        $this->withHeader('Authorization', $this->bearer($author));

        $this->getJson("/api/v1/articles/{$article->id}")
            ->assertOk()
            ->assertJsonPath('data.id', $article->id)
            ->assertJsonCount(2, 'data.versions');

        $this->getJson("/api/v1/articles/{$article->id}/versions")
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonMissingPath('data.0.creator.email');
    }

    public function test_author_with_bearer_sees_unpublished_revision_of_published_article(): void
    {
        $author = $this->createUserWithRole('contributor');
        $article = $this->publishedArticleWithRevision($author);

        $this->withHeader('Authorization', $this->bearer($author))
            ->getJson("/api/v1/articles/{$article->id}/versions")
            ->assertOk()
            ->assertJsonCount(2, 'data');
    }

    public function test_other_contributor_with_bearer_cannot_view_someone_elses_draft(): void
    {
        $author = $this->createUserWithRole('contributor');
        $other = $this->createUserWithRole('contributor');
        $article = $this->draftWithTwoVersions($author);

        $this->withHeader('Authorization', $this->bearer($other));

        $this->getJson("/api/v1/articles/{$article->id}")->assertStatus(403);
        $this->getJson("/api/v1/articles/{$article->id}/versions")->assertStatus(403);
    }

    public function test_guest_cannot_view_draft_versions(): void
    {
        $author = $this->createUserWithRole('contributor');
        $article = $this->draftWithTwoVersions($author);

        $this->getJson("/api/v1/articles/{$article->id}/versions")->assertStatus(403);
    }

    public function test_admin_with_bearer_sees_all_versions(): void
    {
        $author = $this->createUserWithRole('contributor');
        $admin = $this->createUserWithRole('admin');
        $published = $this->publishedArticleWithRevision($author);
        $draft = $this->draftWithTwoVersions($author);

        $this->withHeader('Authorization', $this->bearer($admin));

        $this->getJson("/api/v1/articles/{$published->id}/versions")
            ->assertOk()
            ->assertJsonCount(2, 'data');

        $this->getJson("/api/v1/articles/{$draft->id}")
            ->assertOk()
            ->assertJsonCount(2, 'data.versions');
    }

    /**
     * Attach one file to every version of the article; returns [published, unpublished] version ids.
     */
    protected function attachToVersions(Article $article): array
    {
        $attachmentService = app(ArticleAttachmentService::class);
        $published = null;
        $unpublished = null;

        foreach ($article->versions()->get() as $version) {
            $attachmentService->addAttachment($version, [
                'object_key' => "articles/{$version->id}.pdf",
                'file_name' => "v{$version->version_no}.pdf",
                'mime_type' => 'application/pdf',
                'size_bytes' => 1024,
            ]);

            if ($version->id === $article->published_version_id) {
                $published = $version->id;
            } else {
                $unpublished = $version->id;
            }
        }

        return [$published, $unpublished];
    }

    public function test_bookmarks_list_does_not_expose_author_email(): void
    {
        $author = $this->createUserWithRole('contributor');
        $reader = $this->createUserWithRole('user');
        $article = $this->publishedArticleWithRevision($author);

        app(BookmarkService::class)->bookmark((string) $reader->id, $article->id);

        $response = $this->withHeader('Authorization', $this->bearer($reader))
            ->getJson('/api/v1/bookmarks');

        $response->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.author.name', $author->name)
            ->assertJsonMissingPath('data.0.author.email');
        $this->assertStringNotContainsString($author->email, $response->getContent());
    }

    public function test_guest_can_list_attachments_of_published_version_only(): void
    {
        $author = $this->createUserWithRole('contributor');
        $article = $this->publishedArticleWithRevision($author);
        [$publishedId, $unpublishedId] = $this->attachToVersions($article);

        $this->assertNotNull($publishedId);
        $this->assertNotNull($unpublishedId);

        $this->getJson("/api/v1/versions/{$publishedId}/attachments")
            ->assertOk()
            ->assertJsonCount(1, 'data');

        $this->getJson("/api/v1/versions/{$unpublishedId}/attachments")
            ->assertStatus(403);
    }

    public function test_guest_cannot_list_attachments_of_draft_version(): void
    {
        $author = $this->createUserWithRole('contributor');
        $article = $this->draftWithTwoVersions($author);
        $version = $article->versions()->first();

        $this->getJson("/api/v1/versions/{$version->id}/attachments")
            ->assertStatus(403);
    }

    public function test_author_with_bearer_can_list_attachments_of_own_draft_version(): void
    {
        $author = $this->createUserWithRole('contributor');
        $article = $this->draftWithTwoVersions($author);
        $this->attachToVersions($article);
        $version = $article->versions()->first();

        $this->withHeader('Authorization', $this->bearer($author))
            ->getJson("/api/v1/versions/{$version->id}/attachments")
            ->assertOk()
            ->assertJsonCount(1, 'data');
    }

    public function test_other_contributor_with_bearer_cannot_list_unpublished_version_attachments(): void
    {
        $author = $this->createUserWithRole('contributor');
        $other = $this->createUserWithRole('contributor');
        $article = $this->publishedArticleWithRevision($author);
        [, $unpublishedId] = $this->attachToVersions($article);

        $this->withHeader('Authorization', $this->bearer($other))
            ->getJson("/api/v1/versions/{$unpublishedId}/attachments")
            ->assertStatus(403);
    }

    public function test_attachments_of_unknown_version_return_404(): void
    {
        $this->getJson('/api/v1/versions/00000000-0000-0000-0000-000000000000/attachments')
            ->assertStatus(404);
    }
}
