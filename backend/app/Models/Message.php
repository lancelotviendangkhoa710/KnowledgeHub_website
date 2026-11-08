<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Message extends Model
{
    use HasUuids;

    /**
     * The messages table only has created_at; messages are immutable (AI-02 V1).
     *
     * @var string|null
     */
    const UPDATED_AT = null;

    /**
     * `created_at` is fillable because the send flow sets explicit microsecond
     * timestamps inside one transaction so user/assistant ordering is stable.
     */
    protected $fillable = ['conversation_id', 'role', 'content', 'metadata', 'created_at', 'sequence', 'client_message_id'];

    protected $casts = ['metadata' => 'array'];

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(Conversation::class);
    }
}
