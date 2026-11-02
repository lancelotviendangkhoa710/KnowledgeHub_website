<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ArticleAttachment extends Model
{
    use HasFactory, HasUuids;

    public const UPDATED_AT = null;

    protected $table = 'article_attachments';

    protected $fillable = [
        'article_version_id',
        'object_key',
        'file_name',
        'mime_type',
        'size_bytes',
    ];

    protected function casts(): array
    {
        return [
            'size_bytes' => 'integer',
            'created_at' => 'datetime',
        ];
    }

    /**
     * Article version snapshot this attachment is attached to.
     */
    public function version(): BelongsTo
    {
        return $this->belongsTo(ArticleVersion::class, 'article_version_id');
    }
}

