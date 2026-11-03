<?php

namespace App\Http\Requests\Content;

use App\Models\Article;
use Illuminate\Foundation\Http\FormRequest;

class CreateArticleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null && $this->user()->can('create', Article::class);
    }

    public function rules(): array
    {
        return [
            'title' => 'required|string|max:255',
            'content' => 'required|string',
            'slug' => 'nullable|string|max:255|unique:articles,slug',
            'category_id' => 'nullable|uuid|exists:categories,id',
            'tags' => 'nullable|array',
            'tags.*' => 'string|max:50',
        ];
    }
}

