<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class RoadmapItem extends Model
{
    use HasUuids;

    protected $fillable = ['roadmap_id', 'article_id', 'title', 'description', 'position'];

    public function roadmap(): BelongsTo
    {
        return $this->belongsTo(LearningRoadmap::class, 'roadmap_id');
    }

    public function progress(): HasOne
    {
        return $this->hasOne(LearningProgress::class, 'roadmap_item_id');
    }

    public function prerequisites(): BelongsToMany
    {
        return $this->belongsToMany(
            self::class,
            'roadmap_item_prerequisites',
            'roadmap_item_id',
            'prerequisite_item_id',
        );
    }

    public function dependents(): BelongsToMany
    {
        return $this->belongsToMany(
            self::class,
            'roadmap_item_prerequisites',
            'prerequisite_item_id',
            'roadmap_item_id',
        );
    }
}