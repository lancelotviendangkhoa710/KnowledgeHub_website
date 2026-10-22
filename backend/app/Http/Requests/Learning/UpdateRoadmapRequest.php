<?php

namespace App\Http\Requests\Learning;

use Illuminate\Foundation\Http\FormRequest;

class UpdateRoadmapRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'goal' => ['sometimes', 'required', 'string'],
            'status' => ['sometimes', 'string', 'in:active,completed,archived,paused'],
        ];
    }
}