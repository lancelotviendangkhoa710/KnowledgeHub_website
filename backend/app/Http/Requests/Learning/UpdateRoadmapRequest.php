<?php

namespace App\Http\Requests\Learning;

use App\Models\LearningRoadmap;
use App\Models\User;
use App\Policies\RoadmapPolicy;
use Illuminate\Foundation\Http\FormRequest;

class UpdateRoadmapRequest extends FormRequest
{
    public function authorize(): bool
    {
        $roadmap = $this->route('roadmap');

        return $this->user() instanceof User
            && $roadmap instanceof LearningRoadmap
            && app(RoadmapPolicy::class)->update($this->user(), $roadmap);
    }

    public function rules(): array
    {
        return [
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'goal' => ['sometimes', 'required', 'string'],
            'status' => ['sometimes', 'string', 'in:active,completed,archived,paused'],
        ];
    }
}
