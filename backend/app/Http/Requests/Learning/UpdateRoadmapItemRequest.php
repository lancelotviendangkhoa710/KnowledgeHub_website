<?php

namespace App\Http\Requests\Learning;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateRoadmapItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'article_id' => [
                'sometimes',
                'nullable',
                'uuid',
                Rule::exists('articles', 'id')->whereNull('deleted_at'),
            ],
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['sometimes', 'nullable', 'string'],
            'position' => ['sometimes', 'integer', 'min:0', 'max:65535'],
            // Item status mirrors learning_progress.status. Only PATCH progress
            // may change it.
            'status' => ['prohibited'],
        ];
    }
}
