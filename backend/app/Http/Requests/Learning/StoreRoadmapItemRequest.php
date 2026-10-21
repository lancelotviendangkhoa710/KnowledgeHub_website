<?php

namespace App\Http\Requests\Learning;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreRoadmapItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
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
