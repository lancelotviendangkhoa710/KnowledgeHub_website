<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Explicit-only V1 user memory (AI-03).
 *
 * Rows are user-authored; no AI extraction exists in V1. Deletion is a
 * tombstone (`status = 'deleted'`) so the row survives for retention/audit
 * semantics while being excluded from lists and prompt injection.
 */
class UserMemory extends Model
{
    use HasUuids;

    protected $fillable = [
        'user_id',
        'memory_type',
        'content',
        'source_message_id',
        'status',
        'expires_at',
    ];

    protected $casts = [
        'expires_at' => 'datetime',
    ];

    /** Owner of the memory. Always the authenticated author in V1. */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** Optional provenance; null for explicit-only V1 memories. */
    public function sourceMessage(): BelongsTo
    {
        return $this->belongsTo(Message::class, 'source_message_id');
    }

    /** Status `active` and not past its optional expiry. */
    public function scopeActive(Builder $query): Builder
    {
        return $query
            ->where('status', 'active')
            ->where(function (Builder $query): void {
                $query->whereNull('expires_at')->orWhere('expires_at', '>', now());
            });
    }
}
