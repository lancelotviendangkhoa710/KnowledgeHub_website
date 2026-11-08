<?php

namespace App\Http\Requests\AI;

use Illuminate\Foundation\Http\FormRequest;

class SendMessageRequest extends FormRequest
{
    /** Authorize chat sends for authenticated learners. */
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /** Define request validation rules for a chat message. */
    public function rules(): array
    {
        return [
            'content' => ['required', 'string', 'min:1', 'max:8000', 'not_regex:/^\s*$/'],
            'client_message_id' => ['nullable', 'uuid'],
        ];
    }
}
