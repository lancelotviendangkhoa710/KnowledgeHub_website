<?php

namespace Tests\Feature\Content;

use App\Models\Article;
use App\Models\User;
use App\Services\Content\ArticleService;
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
}
