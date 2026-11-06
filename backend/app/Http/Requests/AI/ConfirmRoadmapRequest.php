<?php

namespace App\Http\Requests\AI;

use Illuminate\Foundation\Http\FormRequest;
use App\Models\LearningRoadmap;
use Illuminate\Support\Facades\Gate;

class ConfirmRoadmapRequest extends FormRequest
{
    /** Authorize confirmation through the roadmap creation policy. */
    public function authorize(): bool
    {
        return $this->user() !== null && Gate::allows('create', LearningRoadmap::class);
    }

    /** Define the allowed fields and bounds for a roadmap confirmation. */
    public function rules(): array
    {
        return [
            'goal' => ['required', 'string', 'min:3', 'max:500', 'not_regex:/^\s*$/'],
            'title' => ['required', 'string', 'min:1', 'max:255', 'not_regex:/^\s*$/'],
            'summary' => ['required', 'string', 'min:1', 'max:5000', 'not_regex:/^\s*$/'],
            'items' => ['required', 'array', 'min:4', 'max:12'],
            'items.*.position' => ['required', 'integer', 'min:1', 'max:12'],
            'items.*.title' => ['required', 'string', 'min:1', 'max:255', 'not_regex:/^\s*$/'],
            'items.*.description' => ['required', 'string', 'min:1', 'max:5000', 'not_regex:/^\s*$/'],
            'items.*.skills' => ['present', 'array', 'max:30'],
            'items.*.skills.*' => ['required', 'string', 'max:100'],
            'items.*.article_id' => ['prohibited'],
        ];
    }
}
