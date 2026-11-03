<?php

namespace App\Services\Auth;

use App\Models\PersonalAccessToken;
use App\Models\User;
use Illuminate\Database\DatabaseManager;
use Illuminate\Hashing\HashManager;
use Illuminate\Validation\ValidationException;

class ProfileService
{
    public function __construct(
        private HashManager $hash,
        private DatabaseManager $database,
    ) {}

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

        $this->database->transaction(function () use ($user, $newPassword): void {
            $user->update(['password' => $newPassword]);

            $current = $user->currentAccessToken();
            $user->tokens()
                ->when($current instanceof PersonalAccessToken, fn ($q) => $q->where('id', '!=', $current->getKey()))
                ->delete();
        });
    }

    /**
     * Soft-delete the account after re-verifying the password and revoke all
     * tokens. Rows in conversations, payments, roadmaps, etc. are left intact:
     * their FKs are RESTRICT and have independent retention requirements.
     */
    public function deleteAccount(User $user, string $currentPassword): void
    {
        $this->database->transaction(function () use ($user, $currentPassword): void {
            // Same lock order as changeStatus: admin role row first, then the user row.
            $this->database->table('roles')->where('name', 'admin')->lockForUpdate()->value('id');
            $locked = User::query()->whereKey($user->getKey())->lockForUpdate()->firstOrFail();
            $this->assertPassword($locked, $currentPassword);

            // The last admin cannot leave the platform without an administrator.
            if ($user->roles()->where('name', 'admin')->exists() && $this->otherActiveAdmins($user) === 0) {
                throw ValidationException::withMessages([
                    'current_password' => ['The last administrator cannot delete their account.'],
                ]);
            }

            $user->tokens()->delete();
            $user->delete();
        });
    }

    private function otherActiveAdmins(User $user): int
    {
        return User::query()
            ->where('status', 'active')
            ->whereKeyNot($user->getKey())
            ->whereHas('roles', fn ($q) => $q->where('name', 'admin'))
            ->count();
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
