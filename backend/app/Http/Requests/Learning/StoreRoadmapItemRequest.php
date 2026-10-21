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
            'article_id' => ['nullable', 'uuid', 'exists:articles,id'],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'position' => [
                'required', 'integer', 'min:0', 'max:65535',
                Rule::unique('roadmap_items', 'position')->where('roadmap_id', $this->route('roadmap')),
            ],
            'status' => ['sometimes', 'string', 'in:pending,in_progress,completed,skipped'],
        ];
    }
}