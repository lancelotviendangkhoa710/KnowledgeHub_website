<?php

namespace App\Policies;

use App\Models\User;

/**
 * Authorization for the public Identity/Auth endpoints (AUTH-01).
 *
 * Registration and login are guest-only operations: a caller that already
 * holds a credential must not create or obtain another one through them.
 */
class UserPolicy
{
    public function register(?User $user): bool
    {
        return $user === null;
    }

    public function login(?User $user): bool
    {
        return $user === null;
    }

    /**
     * A token can only be revoked by the request that authenticated with it.
     */
    public function logout(User $user): bool
    {
        return $user->currentAccessToken() !== null;
    }

    /**
     * Any authenticated user may read and edit their own profile; the profile
     * endpoints never take a user id, so ownership is implicit.
     */
    public function viewProfile(User $user): bool
    {
        return true;
    }

    public function viewAny(User $user): bool
    {
        return $this->isAdmin($user);
    }

    public function view(User $user, User $target): bool
    {
        return $this->isAdmin($user);
    }

    /** Admins manage other accounts; nobody changes their own status. */
    public function updateStatus(User $user, User $target): bool
    {
        return $this->isAdmin($user) && $user->getKey() !== $target->getKey();
    }

    /** Admins assign roles to other accounts; nobody changes their own role. */
    public function updateRole(User $user, User $target): bool
    {
        return $this->updateStatus($user, $target);
    }

    private function isAdmin(User $user): bool
    {
        return $user->roles()->where('name', 'admin')->exists();
    }
}
