<?php

namespace App\Http\Requests\AI;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class GenerateRoadmapRequest extends FormRequest
{
    /** Authorize roadmap previews for authenticated learners. */
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /** Define request validation rules for roadmap preview input. */
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

    /** Add cross-field validation for the aggregate pasted job-posting limit. */
    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $postings = $this->input('job_postings', []);
            if (! is_array($postings)) {
                return;
            }

            $totalLength = array_sum(array_map(
                static fn ($posting): int => is_string($posting) ? mb_strlen($posting) : 0,
                $postings,
            ));
            if ($totalLength > 15000) {
                $validator->errors()->add('job_postings', 'The combined job postings may not exceed 15000 characters.');
            }
        });
    }
}
