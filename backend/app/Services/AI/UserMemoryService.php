<?php

namespace App\Services\AI;

use App\Models\User;
use App\Models\UserMemory;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

/**
 * AI-03 explicit-only user memory (V1).
 *
 * Every read path is owner-scoped: there is no admin path and no query that
 * accepts a user id from the caller. Deletion is a tombstone, not a hard
 * delete, so the row remains while list/prompt reads exclude it.
 */
class UserMemoryService
{
    /** Paginated owner list; tombstoned rows are hidden. */
    public function list(User $user): LengthAwarePaginator
    {
        return UserMemory::query()
            ->where('user_id', $user->id)
            ->where('status', '!=', 'deleted')
            ->orderByDesc('created_at')
            ->paginate(50);
    }

    /** Create a memory for the authenticated owner; client user_id is ignored. */
    public function create(User $user, array $attributes): UserMemory
    {
        return UserMemory::query()->create([
            'user_id' => $user->id,
            'memory_type' => $attributes['memory_type'],
            'content' => $attributes['content'],
            'expires_at' => $attributes['expires_at'] ?? null,
            'status' => 'active',
        ]);
    }

    /** Owner-scoped lookup: foreign or unknown ids raise 404, never 403. */
    public function find(User $user, string $id): UserMemory
    {
        return UserMemory::query()
            ->where('user_id', $user->id)
            ->whereKey($id)
            ->firstOrFail();
    }

    public function update(UserMemory $memory, array $attributes): UserMemory
    {
        $memory->fill($attributes)->save();

        return $memory->refresh();
    }

    /** Soft semantic delete: keep the row, mark it `deleted`. */
    public function delete(UserMemory $memory): void
    {
        $memory->update(['status' => 'deleted']);
    }

    /**
     * Plain content strings ready to be injected as a labelled data block by
     * the chat service. Owner-scoped, active-only, newest first, capped, and
     * with blank rows removed. Never returns ids, source or system metadata.
     *
     * @return array<int, string>
     */
    public function activeForPrompt(User $user, int $limit = 10): array
    {
        if ($limit < 1) {
            return [];
        }

        return UserMemory::query()
            ->where('user_id', $user->id)
            ->active()
            ->whereRaw("trim(content) <> ''")
            ->orderByDesc('created_at')
            ->limit($limit)
            ->pluck('content')
            ->map(static fn (string $content): string => trim($content))
            ->all();
    }
}
