<?php

namespace App\Http\Requests\AI;

use App\Models\LearningRoadmap;
use Illuminate\Foundation\Http\FormRequest;

class FormRoadmapPreviewRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('create', LearningRoadmap::class) ?? false;
    }

    public function rules(): array
    {
        return [
            'career_goal' => ['required', 'string', 'min:3', 'max:500'],
            'current_level' => ['required', 'string', 'min:3', 'max:200'],
            'target_job_requirements' => ['required', 'string', 'min:1', 'max:5000'],
            'weeks' => ['required', 'integer', 'between:1,104'],
            'hours_per_week' => ['required', 'integer', 'between:1,80'],
            'cv_file' => ['nullable', 'file', 'mimetypes:application/pdf', 'extensions:pdf', 'max:2048'],
        ];
    }
}
