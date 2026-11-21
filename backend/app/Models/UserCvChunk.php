<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserCvChunk extends Model
{
    use HasUuids;
    public const UPDATED_AT = null;
    protected $guarded = [];
    protected $hidden = ['embedding'];
    public function index(): BelongsTo { return $this->belongsTo(UserCvIndex::class, 'user_cv_index_id'); }
}
