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
            'goal' => ['required', 'string', 'min:3', 'max:500'],
            'level' => ['required', 'string', 'in:beginner,intermediate,advanced'],
            'weeks' => ['required', 'integer', 'min:1', 'max:104'],
            'hours_per_week' => ['required', 'integer', 'min:1', 'max:80'],
        ];
    }
}
