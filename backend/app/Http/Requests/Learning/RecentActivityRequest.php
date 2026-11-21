<?php

namespace App\Http\Requests\Learning;

use Illuminate\Foundation\Http\FormRequest;

/** PRF-07: page of recently completed steps; `date` (Vietnam calendar day) narrows it to one day. */
class RecentActivityRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'page' => ['sometimes', 'integer', 'min:1', 'max:10000'],
            'date' => ['sometimes', 'date_format:Y-m-d'],
        ];
    }
}
