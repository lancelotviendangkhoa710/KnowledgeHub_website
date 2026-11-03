<?php

namespace App\Http\Requests\Content;

use Illuminate\Foundation\Http\FormRequest;

class PublishArticleRequest extends FormRequest
{
    public function authorize(): bool
    {
        $article = $this->route('article');
        if (!$article) {
            return false;
        }

        return $this->user() !== null && $this->user()->can('publish', $article);
    }

    public function rules(): array
    {
        return [
            'version_id' => 'nullable|uuid|exists:article_versions,id',
        ];
    }
}

