<?php

namespace App\Http\Requests\AI;

use Illuminate\Foundation\Http\FormRequest;

class ConfirmRoadmapRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

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
            'items.*.skills' => ['required', 'array', 'max:30'],
            'items.*.skills.*' => ['required', 'string', 'max:100'],
            'items.*.article_id' => ['prohibited'],
        ];
    }
}
