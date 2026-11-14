<?php

namespace App\Http\Requests\AI;

use App\Models\LearningRoadmap;
use Illuminate\Foundation\Http\FormRequest;

class FormRoadmapConfirmRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('create', LearningRoadmap::class) ?? false;
    }

    public function rules(): array
    {
        return ['preview_token' => ['required', 'string', 'max:150000']];
    }
}
