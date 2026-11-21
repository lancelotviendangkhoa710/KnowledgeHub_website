<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class UserCvIndex extends Model
{
    use HasUuids;

    protected $table = 'user_cv_indexes';
    protected $guarded = [];
    protected $casts = ['indexed_at' => 'datetime', 'embedding_dimensions' => 'integer'];

    public function cv(): BelongsTo { return $this->belongsTo(UserCv::class, 'user_cv_id'); }
    public function chunks(): HasMany { return $this->hasMany(UserCvChunk::class); }
}
