<?php

namespace Tests\Unit\Content;

use App\Models\Article;
use App\Policies\ArticlePolicy;
use App\Services\Content\ArticleService;
use App\Services\Content\TagService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Feature\Content\ContentTestHelper;
use Tests\TestCase;

class ArticlePolicyTest extends TestCase
{
    use RefreshDatabase, ContentTestHelper;

    public function test_guest_can_view_published_articles_only(): void
    {
        $policy = new ArticlePolicy();
        $author = $this->createUserWithRole('contributor');
        $tagService = new TagService();
        $articleService = new ArticleService($tagService);

        $article = $articleService->create([
            'title' => 'Draft Article',
            'content' => 'Secret draft',
        ], $author);

        // Guest cannot view draft
        $this->assertFalse($policy->view(null, $article));

        // Guest can view published
        $articleService->publish($article);
        $this->assertTrue($policy->view(null, $article->fresh()));

        // Guest can view list of published
        $this->assertTrue($policy->viewAny(null));
    }

    public function test_contributor_can_only_manage_own_articles(): void
    {
        $policy = new ArticlePolicy();
        $contributor1 = $this->createUserWithRole('contributor');
        $contributor2 = $this->createUserWithRole('contributor');

        $tagService = new TagService();
        $articleService = new ArticleService($tagService);

        $article = $articleService->create([
            'title' => 'Contributor 1 Article',
            'content' => 'Content',
        ], $contributor1);

        // Contributor 1 can update, publish, archive, delete own
        $this->assertTrue($policy->update($contributor1, $article));
        $this->assertTrue($policy->publish($contributor1, $article));
        $this->assertTrue($policy->archive($contributor1, $article));
        $this->assertTrue($policy->delete($contributor1, $article));

        // Contributor 2 cannot update, publish, archive, delete contributor 1's article
        $this->assertFalse($policy->update($contributor2, $article));
        $this->assertFalse($policy->publish($contributor2, $article));
        $this->assertFalse($policy->archive($contributor2, $article));
        $this->assertFalse($policy->delete($contributor2, $article));
    }

    public function test_admin_has_platform_wide_access(): void
    {
        $policy = new ArticlePolicy();
        $contributor = $this->createUserWithRole('contributor');
        $admin = $this->createUserWithRole('admin');

        $tagService = new TagService();
        $articleService = new ArticleService($tagService);

        $article = $articleService->create([
            'title' => 'Contributor Draft',
            'content' => 'Content',
        ], $contributor);

        // Admin bypass before() returns true for any ability
        $this->assertTrue($policy->before($admin, 'update'));
        $this->assertTrue($policy->before($admin, 'delete'));
        $this->assertTrue($policy->before($admin, 'publish'));
    }

    public function test_normal_user_cannot_create_or_mutate_articles(): void
    {
        $policy = new ArticlePolicy();
        $user = $this->createUserWithRole('user');
        $contributor = $this->createUserWithRole('contributor');

        $tagService = new TagService();
        $articleService = new ArticleService($tagService);

        $article = $articleService->create([
            'title' => 'Article',
            'content' => 'Content',
        ], $contributor);

        $this->assertFalse($policy->create($user));
        $this->assertFalse($policy->update($user, $article));
        $this->assertFalse($policy->publish($user, $article));
        $this->assertFalse($policy->delete($user, $article));
    }
}

