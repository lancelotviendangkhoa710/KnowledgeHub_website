<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ArticleVersion extends Model
{
    use HasFactory, HasUuids;

    public const UPDATED_AT = null;

    protected $table = 'article_versions';

    protected $fillable = [
        'article_id',
        'version_no',
        'title',
        'content',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'version_no' => 'integer',
            'created_at' => 'datetime',
        ];
    }

    /**
     * Parent article this version snapshot belongs to.
     */
    public function article(): BelongsTo
    {
        return $this->belongsTo(Article::class, 'article_id');
    }

    /**
     * User who authored this version snapshot.
     */
    public function creator(): BelongsTo
    {
        $related = new User();
        $related->setKeyType('string');
        $related->incrementing = false;

        return $this->newBelongsTo(
            $related->newQuery(),
            $this,
            'created_by',
            'id',
            'creator'
        );
    }

    /**
     * File attachments linked to this article version snapshot.
     */
    public function attachments(): HasMany
    {
        return $this->hasMany(ArticleAttachment::class, 'article_version_id');
    }
}
