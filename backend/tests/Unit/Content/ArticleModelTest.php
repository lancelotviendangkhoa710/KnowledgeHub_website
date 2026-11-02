<?php

namespace Tests\Unit\Content;

use App\Models\Article;
use App\Models\ArticleVersion;
use App\Models\Category;
use App\Models\Tag;
use App\Services\Content\ArticleService;
use App\Services\Content\TagService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\Feature\Content\ContentTestHelper;
use Tests\TestCase;

class ArticleModelTest extends TestCase
{
    use RefreshDatabase, ContentTestHelper;

    public function test_article_creation_creates_version_one_and_uuid(): void
    {
        $author = $this->createUserWithRole('contributor');
        $tagService = new TagService();
        $articleService = new ArticleService($tagService);

        $article = $articleService->create([
            'title' => 'Mastering PostgreSQL',
            'content' => 'Comprehensive guide to advanced PostgreSQL indexing.',
        ], $author);

        $this->assertNotEmpty($article->id);
        $this->assertTrue(Str::isUuid($article->id));
        $this->assertEquals(Article::STATUS_DRAFT, $article->status);
        $this->assertNull($article->published_version_id);
        $this->assertNull($article->published_at);
        $this->assertCount(1, $article->versions);
        $this->assertEquals(1, $article->versions->first()->version_no);
        $this->assertEquals('Mastering PostgreSQL', $article->versions->first()->title);
    }

    public function test_creating_new_version_increments_version_number(): void
    {
        $author = $this->createUserWithRole('contributor');
        $tagService = new TagService();
        $articleService = new ArticleService($tagService);

        $article = $articleService->create([
            'title' => 'Clean Architecture',
            'content' => 'First draft of clean architecture principles.',
        ], $author);

        $v2 = $articleService->createVersion($article, [
            'title' => 'Clean Architecture v2',
            'content' => 'Refined explanation of service layer.',
        ], $author);

        $this->assertEquals(2, $v2->version_no);
        $this->assertEquals(2, $article->fresh()->versions()->count());
    }

    public function test_publishing_validates_version_belongs_to_article(): void
    {
        $author = $this->createUserWithRole('contributor');
        $tagService = new TagService();
        $articleService = new ArticleService($tagService);

        $article1 = $articleService->create([
            'title' => 'Article One',
            'content' => 'Content one',
        ], $author);

        $article2 = $articleService->create([
            'title' => 'Article Two',
            'content' => 'Content two',
        ], $author);

        $foreignVersion = $article2->versions->first();

        // Strict business rule: Cannot publish with a version belonging to another article
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Cannot publish version: version does not belong to this article.');

        $articleService->publish($article1, $foreignVersion->id);
    }

    public function test_publishing_sets_status_published_at_and_published_version_id(): void
    {
        $author = $this->createUserWithRole('contributor');
        $tagService = new TagService();
        $articleService = new ArticleService($tagService);

        $article = $articleService->create([
            'title' => 'Ready to Publish',
            'content' => 'High quality content ready for public.',
        ], $author);

        $published = $articleService->publish($article);

        $this->assertEquals(Article::STATUS_PUBLISHED, $published->status);
        $this->assertNotNull($published->published_version_id);
        $this->assertNotNull($published->published_at);
        $this->assertTrue($published->isPublished());
    }

    public function test_archiving_changes_status_to_archived(): void
    {
        $author = $this->createUserWithRole('contributor');
        $tagService = new TagService();
        $articleService = new ArticleService($tagService);

        $article = $articleService->create([
            'title' => 'Legacy Article',
            'content' => 'Deprecated content.',
        ], $author);

        $articleService->publish($article);
        $archived = $articleService->archive($article);

        $this->assertEquals(Article::STATUS_ARCHIVED, $archived->status);
        $this->assertTrue($archived->isArchived());
    }

    public function test_soft_deletes_preserve_history_in_database(): void
    {
        $author = $this->createUserWithRole('contributor');
        $tagService = new TagService();
        $articleService = new ArticleService($tagService);

        $article = $articleService->create([
            'title' => 'Temporary Guide',
            'content' => 'Content.',
        ], $author);

        $articleId = $article->id;
        $articleService->delete($article);

        $this->assertNull(Article::find($articleId));
        $this->assertNotNull(Article::withTrashed()->find($articleId));
        $this->assertNotNull(Article::withTrashed()->find($articleId)->deleted_at);
    }
}

