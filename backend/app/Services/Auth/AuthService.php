<?php

namespace App\Services\Auth;

use App\Models\PersonalAccessToken;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\DatabaseManager;
use Illuminate\Database\QueryException;
use Illuminate\Hashing\HashManager;
use Illuminate\Validation\ValidationException;
use Laravel\Sanctum\NewAccessToken;
use RuntimeException;

class AuthService
{
    public function __construct(
        private DatabaseManager $database,
        private HashManager $hash,
    ) {}

    public function register(array $attributes): User
    {
        try {
            return $this->database->transaction(function () use ($attributes): User {
                $user = new User([
                    'name' => $attributes['name'],
                    'email' => $attributes['email'],
                    'password' => $attributes['password'],
                ]);
                $user->status = 'pending';
                $user->save();

                $role = Role::query()->where('name', 'user')->first();

                // Roles are reference data seeded by RoleSeeder, not created on
                // the fly. Fail loudly (and roll the transaction back) instead
                // of returning a misleading 404 when the seed step was skipped.
                if ($role === null) {
                    throw new RuntimeException(
                        'The default "user" role is missing. Seed the approved roles before enabling registration.'
                    );
                }

                $user->roles()->attach($role->getKey());

                return $user->load('roles');
            });
        } catch (QueryException $exception) {
            if ($this->isDuplicateEmail($exception)) {
                throw ValidationException::withMessages([
                    'email' => ['The email has already been taken.'],
                ]);
            }

            throw $exception;
        }
    }

    /** @return array{user: User, token: NewAccessToken} */
    public function login(string $email, string $password): array
    {
        $invalid = fn () => ValidationException::withMessages([
            'email' => ['The provided credentials are invalid.'],
        ]);

        // Slow hash check runs without any lock, so wrong-password attempts cannot queue behind a row lock.
        $candidate = User::query()->where('email', $email)->first();
        if (! $candidate || $candidate->status !== 'active' || ! $this->hash->check($password, $candidate->password)) {
            throw $invalid();
        }

        // Re-check status and hash on the locked row so a concurrent ban or password
        // change cannot leave a fresh token behind.
        return $this->database->transaction(function () use ($candidate, $invalid): array {
            $user = User::query()->whereKey($candidate->getKey())->lockForUpdate()->first();

            if (! $user || $user->status !== 'active' || $user->password !== $candidate->password) {
                throw $invalid();
            }

            return [
                'user' => $user->load('roles'),
                'token' => $user->createToken('web'),
            ];
        });
    }

    public function logout(User $user, ?string $plainToken = null): void
    {
        $token = $plainToken ? PersonalAccessToken::findToken($plainToken) : $user->currentAccessToken();

        if ($token && (string) $token->tokenable_id === (string) $user->getKey() && method_exists($token, 'delete')) {
            $token->delete();
        }
    }

    private function isDuplicateEmail(QueryException $exception): bool
    {
        return in_array((string) $exception->getCode(), ['23000', '23505'], true)
            && str_contains($exception->getMessage(), 'users_email_unique');
    }
}
