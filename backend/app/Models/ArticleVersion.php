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

    protected $table = 'article_versions';

    const UPDATED_AT = null;

    protected $fillable = [
        'article_id',
        'version_no',
        'title',
        'content',
        'created_by',
    ];

    /**
     * Parent article for this snapshot.
     */
    public function article(): BelongsTo
    {
        return $this->belongsTo(Article::class, 'article_id');
    }

    /**
     * Author/contributor who created this version.
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * File attachments for this version.
     */
    public function attachments(): HasMany
    {
        return $this->hasMany(ArticleAttachment::class, 'article_version_id');
    }
}
