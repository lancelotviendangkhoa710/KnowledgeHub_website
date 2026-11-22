<?php

namespace App\Http\Requests\Learning;

use App\Policies\RoadmapPolicy;
use Illuminate\Foundation\Http\FormRequest;

/** Query filters for GET /api/learning/roadmaps (LRN-BE-03). */
class ListRoadmapsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null && app(RoadmapPolicy::class)->viewAny($this->user());
    }

    public function rules(): array
    {
        return [
            'mine' => ['sometimes', 'boolean'],
            'origin' => ['sometimes', 'in:legacy,ai'],
            'q' => ['sometimes', 'nullable', 'string', 'max:100'],
            'level' => ['sometimes', 'in:beginner,intermediate,advanced'],
            'sort' => ['sometimes', 'in:created,updated,title'],
        ];
    }

    /** @return array{q: ?string, level: ?string, sort: string} */
    public function filters(): array
    {
        $data = $this->validated();

        return [
            'q' => $data['q'] ?? null,
            'level' => $data['level'] ?? null,
            'sort' => $data['sort'] ?? 'created',
        ];
    }
}
