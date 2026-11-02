<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Article extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    public const STATUS_DRAFT = 'draft';
    public const STATUS_PUBLISHED = 'published';
    public const STATUS_ARCHIVED = 'archived';

    protected $table = 'articles';

    protected $fillable = [
        'author_id',
        'category_id',
        'published_version_id',
        'slug',
        'status',
        'published_at',
    ];

    protected function casts(): array
    {
        return [
            'published_at' => 'datetime',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
            'deleted_at' => 'datetime',
        ];
    }

    /**
     * Scope to query only published articles that have a published version.
     */
    public function scopePublished(Builder $query): Builder
    {
        return $query->where('status', self::STATUS_PUBLISHED)
            ->whereNotNull('published_version_id');
    }

    public function isPublished(): bool
    {
        return $this->status === self::STATUS_PUBLISHED && !empty($this->published_version_id);
    }

    public function isDraft(): bool
    {
        return $this->status === self::STATUS_DRAFT;
    }

    public function isArchived(): bool
    {
        return $this->status === self::STATUS_ARCHIVED;
    }

    /**
     * Author of the article (Contributor or Admin).
     */
    public function author(): BelongsTo
    {
        $related = new User();
        $related->setKeyType('string');
        $related->incrementing = false;

        return $this->newBelongsTo(
            $related->newQuery(),
            $this,
            'author_id',
            'id',
            'author'
        );
    }

    /**
     * Category the article belongs to.
     */
    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class, 'category_id');
    }

    /**
     * Currently active published version snapshot.
     */
    public function publishedVersion(): BelongsTo
    {
        return $this->belongsTo(ArticleVersion::class, 'published_version_id');
    }

    /**
     * All historical version snapshots for this article.
     */
    public function versions(): HasMany
    {
        return $this->hasMany(ArticleVersion::class, 'article_id')->orderBy('version_no', 'desc');
    }

    /**
     * Tags assigned to this article.
     */
    public function tags(): BelongsToMany
    {
        return $this->belongsToMany(Tag::class, 'article_tags', 'article_id', 'tag_id');
    }

    /**
     * Bookmarks created for this article.
     */
    public function bookmarks(): HasMany
    {
        return $this->hasMany(Bookmark::class, 'article_id');
    }

    /**
     * Users who have bookmarked this article.
     */
    public function bookmarkedBy(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'bookmarks', 'article_id', 'user_id');
    }
}
