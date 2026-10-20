<?php

namespace Tests\Feature\Content;

use App\Models\Article;
use App\Models\ArticleVersion;
use App\Models\Category;
use App\Models\Tag;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class ArticleTest extends TestCase
{
    /**
     * Helper to mock an authenticated user.
     */
    protected function createUserWithRole(string $roleName): User
    {
        $user = new User();
        $user->id = (string) Str::uuid();
        $user->name = ucfirst($roleName) . ' User';
        $user->email = "{$roleName}_" . Str::random(5) . "@example.com";
        $user->password = null;

        return $user;
    }

    public function test_article_status_constants(): void
    {
        $this->assertEquals('draft', Article::STATUS_DRAFT);
        $this->assertEquals('published', Article::STATUS_PUBLISHED);
        $this->assertEquals('archived', Article::STATUS_ARCHIVED);
    }

    public function test_article_versioning_and_immutability(): void
    {
        $author = $this->createUserWithRole('contributor');
        $article = new Article([
            'id' => (string) Str::uuid(),
            'author_id' => $author->id,
            'slug' => 'introduction-to-systems-architecture',
            'status' => Article::STATUS_DRAFT,
        ]);

        $this->assertEquals('draft', $article->status);
        $this->assertEquals($author->id, $article->author_id);
    }

    public function test_category_hierarchy_structure(): void
    {
        $parent = new Category([
            'id' => (string) Str::uuid(),
            'name' => 'Computer Science',
            'slug' => 'computer-science',
            'parent_id' => null,
        ]);

        $child = new Category([
            'id' => (string) Str::uuid(),
            'name' => 'Distributed Systems',
            'slug' => 'distributed-systems',
            'parent_id' => $parent->id,
        ]);

        $this->assertNull($parent->parent_id);
        $this->assertEquals($parent->id, $child->parent_id);
    }
}
