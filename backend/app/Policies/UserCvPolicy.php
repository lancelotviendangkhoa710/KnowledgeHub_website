<?php

namespace App\Policies;

use App\Models\User;

class UserCvPolicy
{
    public function create(User $user): bool
    {
        return true;
    }

    public function deleteAll(User $user): bool
    {
        return true;
    }
}