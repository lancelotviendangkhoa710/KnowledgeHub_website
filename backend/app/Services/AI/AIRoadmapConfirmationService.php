<?php

namespace App\Services\AI;

use App\Models\LearningRoadmap;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AIRoadmapConfirmationService
{
    /** Persist an approved AI draft and its ordered items in one transaction. */
    public function save(User $user, array $data): LearningRoadmap
    {
        if (! array_is_list($data['items'])) {
            throw ValidationException::withMessages(['items' => 'Items must be an ordered list.']);
        }
        foreach ($data['items'] as $index => $item) {
            if ((int) $item['position'] !== $index + 1) {
                throw ValidationException::withMessages(['items' => 'Roadmap item positions must be sequential.']);
            }
        }

        return DB::transaction(function () use ($data, $user): LearningRoadmap {
            $roadmap = LearningRoadmap::query()->create([
                'user_id' => $user->id,
                'title' => trim($data['title']),
                'goal' => trim($data['goal']),
                'status' => 'active',
            ]);
            foreach ($data['items'] as $index => $item) {
                $description = trim($item['description']);
                $skills = array_values(array_filter(array_map('trim', $item['skills'])));
                if ($skills !== []) {
                    $description .= "\nSkills: ".implode(', ', $skills);
                }
                $roadmap->items()->create([
                    'title' => trim($item['title']),
                    'description' => $description,
                    'position' => $index + 1,
                ]);
            }

            return $roadmap->load('items');
        });
    }
}
