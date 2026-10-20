<?php

namespace App\Services\Content;

use App\Models\Article;
use App\Models\ArticleVersion;
use App\Models\Tag;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ArticleService
{
    /**
     * Get paginated articles with filtering for public or management views.
     *
     * @param array<string, mixed> $filters
     */
    public function getArticles(array $filters = [], ?User $user = null, int $perPage = 15): LengthAwarePaginator
    {
        $query = Article::query()
            ->with(['author:id,name,email', 'category:id,name,slug', 'publishedVersion', 'tags:id,name,slug']);

        $isAdmin = $user && method_exists($user, 'roles') && $user->roles()->where('name', 'admin')->exists();

        // If user is guest or normal user, strictly only show published
        if (! $user || (! $isAdmin && ! ($user->roles && $user->roles()->where('name', 'contributor')->exists()))) {
            $query->published();
        } else {
            // Contributor can see their own drafts + all published
            if (! $isAdmin) {
                $query->where(function (Builder $q) use ($user) {
                    $q->published()->orWhere('author_id', $user->id);
                });
            }

            // Apply explicit status filter if authorized
            if (! empty($filters['status'])) {
                $query->where('status', $filters['status']);
            }
        }

        if (! empty($filters['category_id'])) {
            $query->byCategory($filters['category_id']);
        }

        if (! empty($filters['tag_slug'])) {
            $query->whereHas('tags', function (Builder $q) use ($filters) {
                $q->where('slug', $filters['tag_slug']);
            });
        }

        if (! empty($filters['search'])) {
            $search = $filters['search'];
            $query->whereHas('publishedVersion', function (Builder $q) use ($search) {
                $q->where('title', 'ilike', "%{$search}%")
                  ->orWhere('content', 'ilike', "%{$search}%");
            });
        }

        return $query->latest('created_at')->paginate($perPage);
    }

    /**
     * Get a single article by ID or slug.
     */
    public function getArticleBySlugOrId(string $identifier, ?User $user = null): ?Article
    {
        $query = Article::query()
            ->with([
                'author:id,name,email',
                'category:id,name,slug',
                'publishedVersion',
                'latestVersion',
                'tags:id,name,slug',
            ])
            ->where(function (Builder $q) use ($identifier) {
                $q->where('id', $identifier)
                  ->orWhere('slug', $identifier);
            });

        $article = $query->first();
        if (! $article) {
            return null;
        }

        return $article;
    }

    /**
     * Create a new article with an initial version (v1) in a transaction.
     *
     * @param array{
     *     title: string,
     *     content: string,
     *     category_id?: ?string,
     *     slug?: ?string,
     *     tags?: array<string>
     * } $data
     */
    public function createArticle(User $author, array $data): Article
    {
        return DB::transaction(function () use ($author, $data) {
            $slug = ! empty($data['slug'])
                ? Str::slug($data['slug'])
                : Str::slug($data['title']) . '-' . Str::lower(Str::random(6));

            $article = Article::create([
                'author_id' => $author->id,
                'category_id' => $data['category_id'] ?? null,
                'slug' => $slug,
                'status' => Article::STATUS_DRAFT,
            ]);

            // Version 1 snapshot
            $version = ArticleVersion::create([
                'article_id' => $article->id,
                'version_no' => 1,
                'title' => $data['title'],
                'content' => $data['content'],
                'created_by' => $author->id,
            ]);

            // Sync tags
            if (! empty($data['tags'])) {
                $this->syncTags($article, $data['tags']);
            }

            return $article->load(['category', 'tags', 'latestVersion']);
        });
    }

    /**
     * Create a new version for an existing article (immutable versioning).
     *
     * @param array{
     *     title: string,
     *     content: string,
     *     category_id?: ?string,
     *     tags?: array<string>
     * } $data
     */
    public function updateArticle(Article $article, User $editor, array $data): Article
    {
        return DB::transaction(function () use ($article, $editor, $data) {
            // Update mutable fields on article root
            if (array_key_exists('category_id', $data)) {
                $article->category_id = $data['category_id'];
                $article->save();
            }

            // Calculate next version number
            $latestVersionNo = (int) $article->versions()->max('version_no');
            $nextVersionNo = $latestVersionNo + 1;

            ArticleVersion::create([
                'article_id' => $article->id,
                'version_no' => $nextVersionNo,
                'title' => $data['title'],
                'content' => $data['content'],
                'created_by' => $editor->id,
            ]);

            // Sync tags if provided
            if (isset($data['tags'])) {
                $this->syncTags($article, $data['tags']);
            }

            return $article->fresh(['category', 'tags', 'publishedVersion', 'latestVersion']);
        });
    }

    /**
     * Publish an article: marks status as published, sets published_version_id
     * to the latest version, and timestamps published_at.
     */
    public function publishArticle(Article $article): Article
    {
        return DB::transaction(function () use ($article) {
            $latestVersion = $article->latestVersion()->first();
            if (! $latestVersion) {
                throw new \RuntimeException('Cannot publish an article without at least one version.');
            }

            $article->update([
                'status' => Article::STATUS_PUBLISHED,
                'published_version_id' => $latestVersion->id,
                'published_at' => now(),
            ]);

            return $article->fresh(['publishedVersion', 'category', 'tags']);
        });
    }

    /**
     * Archive an article.
     */
    public function archiveArticle(Article $article): Article
    {
        $article->update([
            'status' => Article::STATUS_ARCHIVED,
        ]);

        return $article->fresh();
    }

    /**
     * Soft-delete an article.
     */
    public function deleteArticle(Article $article): bool
    {
        return (bool) $article->delete();
    }

    /**
     * Sync string tag names with article_tags join table.
     *
     * @param array<string> $tagNames
     */
    protected function syncTags(Article $article, array $tagNames): void
    {
        $tagIds = [];
        foreach ($tagNames as $name) {
            $cleanName = trim($name);
            if (empty($cleanName)) {
                continue;
            }

            $slug = Str::slug($cleanName);
            $tag = Tag::firstOrCreate(
                ['slug' => $slug],
                ['name' => $cleanName]
            );

            $tagIds[] = $tag->id;
        }

        $article->tags()->sync($tagIds);
    }
}
