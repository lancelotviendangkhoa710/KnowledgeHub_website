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
            'article_id' => ['sometimes', 'nullable', 'uuid', 'exists:articles,id'],
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['sometimes', 'nullable', 'string'],
            'position' => [
                'sometimes', 'integer', 'min:0', 'max:65535',
                Rule::unique('roadmap_items', 'position')
                    ->where('roadmap_id', $this->route('roadmap'))
                    ->ignore($this->route('item')),
            ],
            'status' => ['sometimes', 'string', 'in:pending,in_progress,completed,skipped'],
        ];
    }
}