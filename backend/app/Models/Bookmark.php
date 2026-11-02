<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Bookmark extends Model
{
    use HasFactory;

    public const UPDATED_AT = null;

    protected $table = 'bookmarks';

    public $incrementing = false;

    protected $fillable = [
        'user_id',
        'article_id',
    ];

    protected function casts(): array
    {
        return [
            'created_at' => 'datetime',
        ];
    }

    /**
     * Set the keys for a save update query (handles composite primary key).
     */
    protected function setKeysForSaveQuery($query): Builder
    {
        $keys = $this->getKeyName();
        if (!is_array($keys)) {
            $keys = ['user_id', 'article_id'];
        }

        foreach ($keys as $keyName) {
            $query->where($keyName, '=', $this->getAttribute($keyName));
        }

        return $query;
    }

    /**
     * User who created the bookmark.
     */
    public function user(): BelongsTo
    {
        $related = new User();
        $related->setKeyType('string');
        $related->incrementing = false;

        return $this->newBelongsTo(
            $related->newQuery(),
            $this,
            'user_id',
            'id',
            'user'
        );
    }

    /**
     * Article that was bookmarked.
     */
    public function article(): BelongsTo
    {
        return $this->belongsTo(Article::class, 'article_id');
    }
}
