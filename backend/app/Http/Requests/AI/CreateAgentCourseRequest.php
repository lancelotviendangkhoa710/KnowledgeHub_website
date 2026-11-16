<?php

namespace App\Http\Requests\AI;

use App\Models\Article;
use Illuminate\Foundation\Http\FormRequest;

class CreateAgentCourseRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->status === 'active'
            && $this->user()->roles()->where('name', 'contributor')->exists()
            && ! $this->user()->roles()->where('name', 'admin')->exists()
            && $this->user()->can('create', Article::class);
    }

    public function rules(): array
    {
        return [
            'topic' => ['required', 'string', 'min:3', 'max:200'],
            'max_videos' => ['sometimes', 'integer', 'between:2,6'],
            'category_id' => ['sometimes', 'nullable', 'uuid', 'exists:categories,id'],
        ];
    }
}
