<?php

namespace App\Http\Requests\Learning;

use App\Models\LearningRoadmap;
use App\Models\User;
use App\Policies\RoadmapPolicy;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreRoadmapItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        $roadmap = $this->route('roadmap');

        // The roadmap is resolved by the route model binding, so the policy can
        // decide before validation runs. The controller also authorizes; this
        // keeps the guard attached to the request itself.
        return $this->user() instanceof User
            && $roadmap instanceof LearningRoadmap
            && app(RoadmapPolicy::class)->update($this->user(), $roadmap);
    }

    public function rules(): array
    {
        return [
            'article_id' => [
                'nullable',
                'uuid',
                Rule::exists('articles', 'id')->whereNull('deleted_at'),
            ],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'position' => ['required', 'integer', 'min:0', 'max:65535'],
            // Item status mirrors learning_progress.status. Only PATCH progress
            // may change it.
            'status' => ['prohibited'],
        ];
    }
}
