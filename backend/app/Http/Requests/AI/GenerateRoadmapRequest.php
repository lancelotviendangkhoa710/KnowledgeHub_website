<?php

namespace App\Http\Requests\AI;

use Illuminate\Foundation\Http\FormRequest;

class GenerateRoadmapRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'goal' => ['required', 'string', 'min:3', 'max:500', 'not_regex:/^\s*$/'],
            'level' => ['required', 'string', 'in:beginner,intermediate,advanced'],
            'weeks' => ['required', 'integer', 'min:1', 'max:104'],
            'hours_per_week' => ['required', 'integer', 'min:1', 'max:80'],
            'job_postings' => ['sometimes', 'array', 'max:5'],
            'job_postings.*' => ['required', 'string', 'min:1', 'max:5000', 'not_regex:/^\s*$/'],
        ];
    }
}
