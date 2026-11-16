<?php

namespace App\Http\Requests\AI;

use App\Models\UserCv;
use Illuminate\Foundation\Http\FormRequest;

class ConfirmCvAssessmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null && $this->user()->status === 'active'
            && $this->user()->can('create', UserCv::class);
    }

    public function rules(): array
    {
        return ['cv_file' => ['required', 'file', 'mimetypes:application/pdf', 'extensions:pdf', 'max:2048'],
            'preview_token' => ['required', 'string', 'max:60000']];
    }
}
