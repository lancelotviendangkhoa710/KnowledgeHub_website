<?php

namespace App\Services\Auth;

use App\Models\Role;
use App\Models\PersonalAccessToken;
use App\Models\User;
use Illuminate\Database\DatabaseManager;
use Illuminate\Hashing\HashManager;
use Illuminate\Validation\ValidationException;
use Laravel\Sanctum\NewAccessToken;
use Laravel\Sanctum\Sanctum;

class AuthService
{
    public function __construct(
        private DatabaseManager $database,
        private HashManager $hash,
    ) {}

    public function register(array $attributes): User
    {
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

        Sanctum::usePersonalAccessTokenModel(PersonalAccessToken::class);

        return [
            'user' => $user->load('roles'),
            'token' => $user->createToken('web'),
        ];
    }

    public function logout(User $user): void
    {
        $token = $user->currentAccessToken();

        if ($token && method_exists($token, 'delete')) {
            $token->delete();
        }
    }
}
