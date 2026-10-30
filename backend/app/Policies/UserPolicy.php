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
}
