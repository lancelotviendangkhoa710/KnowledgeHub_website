<?php

namespace App\Services\Content;

use App\Models\Article;
use App\Models\ArticleVersion;
use App\Models\Category;
use App\Models\Tag;
use App\Models\User;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ArticleService
{
    public function __construct(
        protected TagService $tagService
    ) {}

    /**
     * Safely resolve the UUID string of a user model instance.
     */
    protected function resolveUserId(User $user): string
    {
        return (string) ($user->getRawOriginal('id') ?: ($user->getAttributes()['id'] ?? $user->getKey()));
    }

    /**
     * List published articles with optional filtering and pagination.
     */
    public function listPublished(array $filters = [], int $perPage = 15): LengthAwarePaginator
    {
        $query = Article::published()
            ->with(['author', 'category', 'publishedVersion', 'tags']);

        if (!empty($filters['category_slug'])) {
            $query->whereHas('category', function ($q) use ($filters) {
                $q->where('slug', $filters['category_slug']);
            });
        } elseif (!empty($filters['category_id'])) {
            $query->where('category_id', $filters['category_id']);
        }

        if (!empty($filters['tag_slug'])) {
            $query->whereHas('tags', function ($q) use ($filters) {
                $q->where('slug', $filters['tag_slug']);
            });
        } elseif (!empty($filters['tag_id'])) {
            $query->whereHas('tags', function ($q) use ($filters) {
                $q->where('tags.id', $filters['tag_id']);
            });
        }

        if (!empty($filters['author_id'])) {
            $query->where('author_id', $filters['author_id']);
        }

        if (!empty($filters['search'])) {
            $search = '%' . strtolower($filters['search']) . '%';
            $query->whereHas('publishedVersion', function ($q) use ($search) {
                $q->whereRaw('LOWER(title) LIKE ?', [$search]);
            });
        }

        $sort = $filters['sort'] ?? 'latest';
        if ($sort === 'oldest') {
            $query->orderBy('published_at', 'asc');
        } else {
            $query->orderBy('published_at', 'desc');
        }

        return $query->paginate($perPage);
    }

    /**
     * List articles authored by a user (including drafts and archived).
     */
    public function listAuthorArticles(string $authorId, array $filters = [], int $perPage = 15): LengthAwarePaginator
    {
        $query = Article::where('author_id', $authorId)
            ->with(['category', 'publishedVersion', 'tags', 'versions']);

        if (!empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        return $query->orderBy('updated_at', 'desc')->paginate($perPage);
    }

    /**
     * Find a published article by slug.
     */
    public function getPublishedBySlug(string $slug): ?Article
    {
        return Article::published()
            ->where('slug', $slug)
            ->with(['author', 'category', 'publishedVersion.attachments', 'tags'])
            ->first();
    }

    /**
     * Find any article by slug (including drafts/archived for authorized users).
     */
    public function getBySlug(string $slug): ?Article
    {
        return Article::where('slug', $slug)
            ->with(['author', 'category', 'publishedVersion.attachments', 'tags', 'versions'])
            ->first();
    }

    /**
     * Find an article by ID.
     */
    public function getById(string $id): ?Article
    {
        return Article::with(['author', 'category', 'publishedVersion.attachments', 'tags', 'versions'])
            ->find($id);
    }

    /**
     * Create a new article with initial version (version 1) in draft status.
     * Wrapped in DB::transaction() for atomicity.
     */
    public function create(array $data, User $author): Article
    {
        return DB::transaction(function () use ($data, $author) {
            $title = $data['title'];
            $slug = !empty($data['slug']) ? Str::slug($data['slug']) : Str::slug($title);

            // Ensure unique slug
            $baseSlug = $slug;
            $counter = 1;
            while (Article::where('slug', $slug)->exists()) {
                $slug = "{$baseSlug}-{$counter}";
                $counter++;
            }

            $authorId = $this->resolveUserId($author);

            $article = Article::create([
                'author_id' => $authorId,
                'category_id' => $data['category_id'] ?? null,
                'slug' => $slug,
                'status' => Article::STATUS_DRAFT,
                'published_version_id' => null,
                'published_at' => null,
            ]);

            // Create initial version 1
            $version = ArticleVersion::create([
                'article_id' => $article->id,
                'version_no' => 1,
                'title' => $title,
                'content' => $data['content'],
                'created_by' => $authorId,
            ]);

            if (!empty($data['tags']) && is_array($data['tags'])) {
                $this->tagService->syncArticleTags($article, $data['tags']);
            }

            return $article->load(['category', 'tags', 'versions']);
        });
    }

    /**
     * Create a new version snapshot for an existing article.
     * Wrapped in DB::transaction() for concurrency safety.
     */
    public function createVersion(Article $article, array $data, User $creator): ArticleVersion
    {
        return DB::transaction(function () use ($article, $data, $creator) {
            $nextVersionNo = ((int) $article->versions()->max('version_no')) + 1;
            $creatorId = $this->resolveUserId($creator);

            $version = ArticleVersion::create([
                'article_id' => $article->id,
                'version_no' => $nextVersionNo,
                'title' => $data['title'],
                'content' => $data['content'],
                'created_by' => $creatorId,
            ]);

            if (isset($data['category_id'])) {
                $article->category_id = $data['category_id'];
            }

            if (!empty($data['tags']) && is_array($data['tags'])) {
                $this->tagService->syncArticleTags($article, $data['tags']);
            }

            $article->touch();

            return $version;
        });
    }

    /**
     * Publish an article with a specific version or its latest version.
     * Validates that the version belongs to this article!
     */
    public function publish(Article $article, ?string $versionId = null): Article
    {
        return DB::transaction(function () use ($article, $versionId) {
            $version = null;

            if ($versionId) {
                $version = ArticleVersion::find($versionId);
                if (!$version) {
                    throw new \InvalidArgumentException('Specified version not found.');
                }

                // Strict invariant check: version must belong to this article!
                if ($version->article_id !== $article->id) {
                    throw new \InvalidArgumentException('Cannot publish version: version does not belong to this article.');
                }
            } else {
                $version = $article->versions()->orderBy('version_no', 'desc')->first();
                if (!$version) {
                    throw new \RuntimeException('Cannot publish article without any content versions.');
                }
            }

            $article->published_version_id = $version->id;
            $article->status = Article::STATUS_PUBLISHED;
            $article->published_at = now();
            $article->save();

            return $article->fresh(['publishedVersion', 'category', 'tags', 'author']);
        });
    }

    /**
     * Archive an article.
     */
    public function archive(Article $article): Article
    {
        $article->status = Article::STATUS_ARCHIVED;
        $article->save();

        return $article->fresh();
    }

    /**
     * Soft delete an article.
     */
    public function delete(Article $article): void
    {
        $article->delete();
    }
}
