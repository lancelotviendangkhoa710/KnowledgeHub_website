<?php

namespace App\Http\Requests\Learning;

use App\Models\RoadmapItem;
use App\Policies\RoadmapPolicy;
use Illuminate\Foundation\Http\FormRequest;

class StoreRoadmapItemPrerequisiteRequest extends FormRequest
{
    public function authorize(): bool
    {
        $item = $this->route('item');

        return $this->user() instanceof \App\Models\User
            && $item instanceof RoadmapItem
            && app(RoadmapPolicy::class)->managePrerequisites($this->user(), $item->loadMissing('roadmap'));
    }

    public function rules(): array
    {
        return ['prerequisite_item_id' => ['required', 'uuid']];
    }
}