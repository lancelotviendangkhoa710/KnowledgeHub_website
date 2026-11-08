<?php

namespace App\Policies;

use App\Models\User;
use App\Models\UserMemory;

/**
 * Owner-only authorization for AI-03 explicit user memories.
 *
 * There is deliberately NO admin bypass: Product/Privacy decision P9/PR6
 * (ADR-C) keeps memory content private to its owner in V1. A non-owner is
 * filtered out by the owner-scoped service query and receives 404, so this
 * policy is the second layer of defence rather than the user-visible one.
 *
 * Auto-discovered by Laravel's convention: App\Models\UserMemory ->
 * App\Policies\UserMemoryPolicy (no provider registration required).
 */
class UserMemoryPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function view(User $user, UserMemory $memory): bool
    {
        return $this->owns($user, $memory);
    }

    public function update(User $user, UserMemory $memory): bool
    {
        return $this->owns($user, $memory);
    }

    public function delete(User $user, UserMemory $memory): bool
    {
        return $this->owns($user, $memory);
    }

    private function owns(User $user, UserMemory $memory): bool
    {
        return $memory->user_id === $user->id;
    }
}
