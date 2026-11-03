<?php

namespace App\Http\Requests\Content;

use App\Models\ArticleVersion;
use Illuminate\Foundation\Http\FormRequest;

class StoreAttachmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        $version = $this->route('version');
        if (!$version) {
            return false;
        }

        if (is_string($version)) {
            $version = ArticleVersion::find($version);
        }

        if (!$version || !$version->article) {
            return false;
        }

        return $this->user() !== null && $this->user()->can('update', $version->article);
    }

    public function rules(): array
    {
        return [
            'object_key' => 'required|string|max:255|unique:article_attachments,object_key',
            'file_name' => 'required|string|max:255',
            'mime_type' => 'required|string|max:100',
            'size_bytes' => 'required|integer|min:1',
        ];
    }
}

