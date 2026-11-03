<?php

namespace App\Http\Requests\Content;

use Illuminate\Foundation\Http\FormRequest;

class UpdateArticleRequest extends FormRequest
{
    public function authorize(): bool
    {
        $article = $this->route('article');
        if (!$article) {
            return false;
        }

        return $this->user() !== null && $this->user()->can('update', $article);
    }

    public function rules(): array
    {
        return [
            'title' => 'required|string|max:255',
            'content' => 'required|string',
            'category_id' => 'nullable|uuid|exists:categories,id',
            'tags' => 'nullable|array',
            'tags.*' => 'string|max:50',
        ];
    }
}

