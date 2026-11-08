<?php

namespace App\Http\Requests\AI;

use Illuminate\Foundation\Http\FormRequest;

/** Update the editable fields of an explicit user memory (AI-03). */
class UpdateUserMemoryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'content' => ['sometimes', 'string', 'min:1', 'max:1000', 'not_regex:/^\s*$/'],
            // `sometimes|nullable` lets the owner clear an expiry (null).
            'expires_at' => ['sometimes', 'nullable', 'date', 'after:now'],
        ];
    }
}
