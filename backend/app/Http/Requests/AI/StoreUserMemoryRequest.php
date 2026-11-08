<?php

namespace App\Http\Requests\AI;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Create an explicit user memory (AI-03).
 *
 * `instruction` is intentionally excluded: the DB CHECK allows it, but V1
 * rejects it at the API to prevent stored prompt injection (ADR-C T2/PR8).
 */
class StoreUserMemoryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'memory_type' => ['required', 'string', Rule::in(['preference', 'fact', 'goal'])],
            'content' => ['required', 'string', 'min:1', 'max:1000', 'not_regex:/^\s*$/'],
            'expires_at' => ['nullable', 'date', 'after:now'],
        ];
    }
}
