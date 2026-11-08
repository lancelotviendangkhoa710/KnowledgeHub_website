<?php

namespace App\Http\Requests\AI;

use Illuminate\Foundation\Http\FormRequest;

class StoreConversationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * Normalise the optional title: trim surrounding whitespace and treat a
     * blank string as "no title" (V1 default title is a client concern).
     */
    protected function prepareForValidation(): void
    {
        if (! $this->has('title')) {
            return;
        }

        $title = $this->input('title');
        if (! is_string($title)) {
            return;
        }

        $title = trim($title);
        $this->merge(['title' => $title === '' ? null : $title]);
    }

    /**
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'title' => ['nullable', 'string', 'max:120'],
        ];
    }
}
