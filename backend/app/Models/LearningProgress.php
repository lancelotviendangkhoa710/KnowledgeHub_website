<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LearningProgress extends Model
{
    use HasUuids;

    public const STATUSES = ['pending', 'in_progress', 'completed', 'skipped'];

    public $timestamps = false;

    protected $fillable = ['roadmap_item_id', 'status', 'started_at', 'completed_at', 'updated_at'];

    protected $casts = [
        'started_at' => 'datetime',
        'completed_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function roadmapItem(): BelongsTo
    {
        return $this->belongsTo(RoadmapItem::class, 'roadmap_item_id');
    }
}