<?php

namespace App\Services\Auth;

use App\Models\PersonalAccessToken;
use App\Models\User;
use Illuminate\Hashing\HashManager;
use Illuminate\Validation\ValidationException;

class ProfileService
{
    public function __construct(private HashManager $hash) {}

    public function update(User $user, array $attributes): User
    {
        $user->update(['name' => $attributes['name']]);

        return $user->load('roles');
    }

    /**
     * Change the password after re-verifying the current one, then revoke every
     * other session so a stolen token cannot outlive the credential change.
     */
    public function changePassword(User $user, string $currentPassword, string $newPassword): void
    {
        $this->assertPassword($user, $currentPassword);

        $user->update(['password' => $newPassword]);

        $current = $user->currentAccessToken();
        $user->tokens()
            ->when($current instanceof PersonalAccessToken, fn ($q) => $q->where('id', '!=', $current->getKey()))
            ->delete();
    }

    public function assertPassword(User $user, string $password): void
    {
        if (! $this->hash->check($password, $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['The provided password is incorrect.'],
            ]);
        }
    }
}
