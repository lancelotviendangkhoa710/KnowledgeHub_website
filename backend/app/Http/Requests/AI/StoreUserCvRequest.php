<?php

namespace App\Http\Requests\AI;

use Illuminate\Foundation\Http\FormRequest;

class StoreUserCvRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'cv_file' => ['required', 'file', 'mimetypes:application/pdf', 'extensions:pdf', 'max:2048'],
            'consent' => ['required', 'accepted'],
        ];
    }
}
