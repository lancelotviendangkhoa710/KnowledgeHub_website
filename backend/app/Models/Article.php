<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

class Article extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $table = 'articles';

    public const STATUS_DRAFT = 'draft';
    public const STATUS_PUBLISHED = 'published';
    public const STATUS_ARCHIVED = 'archived';

    protected $fillable = [
        'author_id',
        'category_id',
        'published_version_id',
        'slug',
        'status',
        'published_at',
    ];

    protected $casts = [
        'published_at' => 'datetime',
    ];

    /**
     * Author / Contributor who owns this article.
     */
    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'author_id');
    }

    /**
     * Category this article belongs to.
     */
    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class, 'category_id');
    }

    /**
     * Currently active published version.
     */
    public function publishedVersion(): BelongsTo
    {
        return $this->belongsTo(ArticleVersion::class, 'published_version_id');
    }

    /**
     * All versions/history of this article.
     */
    public function versions(): HasMany
    {
        return $this->hasMany(ArticleVersion::class, 'article_id')->orderBy('version_no', 'desc');
    }

    /**
     * Latest version of this article.
     */
    public function latestVersion(): HasOne
    {
        return $this->hasOne(ArticleVersion::class, 'article_id')->latestOfMany('version_no');
    }

    /**
     * Tags assigned to this article.
     */
    public function tags(): BelongsToMany
    {
        return $this->belongsToMany(Tag::class, 'article_tags', 'article_id', 'tag_id');
    }

    /**
     * Bookmarks for this article.
     */
    public function bookmarks(): HasMany
    {
        return $this->hasMany(Bookmark::class, 'article_id');
    }

    /**
     * Scope query to published articles only.
     */
    public function scopePublished(Builder $query): Builder
    {
        return $query->where('status', self::STATUS_PUBLISHED)
                     ->whereNotNull('published_version_id');
    }

    /**
     * Scope query to draft articles.
     */
    public function scopeDraft(Builder $query): Builder
    {
        return $query->where('status', self::STATUS_DRAFT);
    }

    /**
     * Scope query to archived articles.
     */
    public function scopeArchived(Builder $query): Builder
    {
        return $query->where('status', self::STATUS_ARCHIVED);
    }

    /**
     * Scope query by category.
     */
    public function scopeByCategory(Builder $query, string $categoryId): Builder
    {
        return $query->where('category_id', $categoryId);
    }

    /**
     * Scope query by author.
     */
    public function scopeByAuthor(Builder $query, string $authorId): Builder
    {
        return $query->where('author_id', $authorId);
    }
}
