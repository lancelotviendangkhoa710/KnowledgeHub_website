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

                $role = Role::query()->where('name', 'user')->firstOrFail();
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
        $user = User::query()->where('email', $email)->first();

        if (! $user || $user->status !== 'active' || ! $this->hash->check($password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are invalid.'],
            ]);
        }

        return [
            'user' => $user->load('roles'),
            'token' => $user->createToken('web'),
        ];
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
