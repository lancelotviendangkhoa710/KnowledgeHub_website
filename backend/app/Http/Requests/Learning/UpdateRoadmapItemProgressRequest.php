<?php

namespace App\Http\Requests\Learning;

use App\Models\LearningProgress;
use App\Models\RoadmapItem;
use App\Policies\RoadmapPolicy;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateRoadmapItemProgressRequest extends FormRequest
{
    public function authorize(): bool
    {
        $item = $this->route('item');

        return $this->user() instanceof \App\Models\User
            && $item instanceof RoadmapItem
            && app(RoadmapPolicy::class)->updateProgress($this->user(), $item->loadMissing('roadmap'));
    }

    public function rules(): array
    {
        return ['status' => ['required', 'string', Rule::in(LearningProgress::STATUSES)]];
    }
}