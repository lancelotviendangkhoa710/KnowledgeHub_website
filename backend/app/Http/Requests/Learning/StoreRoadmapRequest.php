<?php

namespace App\Http\Requests\Learning;

use App\Policies\RoadmapPolicy;
use Illuminate\Foundation\Http\FormRequest;

class StoreRoadmapRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null && app(RoadmapPolicy::class)->create($this->user());
    }

    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'goal' => ['required', 'string'],
            'status' => ['sometimes', 'string', 'in:active,completed,archived,paused'],
        ];
    }
}