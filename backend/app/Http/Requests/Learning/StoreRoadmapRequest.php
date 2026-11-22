<?php

namespace App\Http\Requests\Learning;

use App\Policies\RoadmapPolicy;
use Illuminate\Foundation\Http\FormRequest;

class StoreRoadmapRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null && app(RoadmapPolicy::class)->create($this->user());
    }

    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'goal' => ['required', 'string'],
            'status' => ['sometimes', 'string', 'in:active,completed,archived,paused'],
            'level' => ['sometimes', 'nullable', 'string', 'in:beginner,intermediate,advanced'],
            'duration_weeks' => ['sometimes', 'nullable', 'integer', 'min:1', 'max:104'],
            // Public roadmaps need a separate ADR (sharing, privacy); only private is accepted for now.
            'visibility' => ['sometimes', 'string', 'in:private'],
            'source_template' => ['sometimes', 'nullable', 'string', 'max:64', 'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/'],
        ];
    }
}