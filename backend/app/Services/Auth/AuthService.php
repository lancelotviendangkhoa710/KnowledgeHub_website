<?php

namespace App\Services\Auth;

use App\Exceptions\Auth\GoogleDomainNotAllowed;
use App\Exceptions\Auth\GoogleSignupLimitReached;
use App\Models\PersonalAccessToken;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\DatabaseManager;
use Illuminate\Database\QueryException;
use Illuminate\Hashing\HashManager;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
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
        return $this->createWithDefaultRole($attributes, 'pending');
    }

    /**
     * AUTH-07: the account for an email Google has verified. An existing active account is reused;
     * an existing account in any other status is refused (null) so Google cannot lift a ban or
     * skip the admin gate; an unknown email gets a new active account with the default role,
     * but only for an allowed email domain (GoogleDomainNotAllowed otherwise).
     * Linking is by verified email only (no schema change, see the ADR).
     */
    public function userForGoogle(string $email, string $name, ?string $ip = null): ?User
    {
        // shortcut: linked by verified email, not Google's stable id; add a google_id column when a schema change is approved.
        $email = Str::lower(trim($email));
        $existing = fn () => User::query()->where('email', $email)->first();

        if ($user = $existing()) {
            return $user->status === 'active' ? $user->load('roles') : null;
        }

        if (! $this->googleDomainAllowed($email)) {
            throw new GoogleDomainNotAllowed($email);
        }

        $limitKey = $this->googleSignupLimitKey($ip);
        $limit = (int) config('services.google.max_new_accounts_per_ip_per_day');
        $hourly = (int) config('services.google.max_new_accounts_per_hour');
        if (($limitKey !== null && $limit > 0 && RateLimiter::tooManyAttempts($limitKey, $limit))
            || ($hourly > 0 && RateLimiter::tooManyAttempts('google-signup:all', $hourly))) {
            throw new GoogleSignupLimitReached($ip ?? 'unknown');
        }

        try {
            // Google-only accounts get a random password nobody knows, so password login is impossible.
            $created = $this->createWithDefaultRole(
                ['name' => $name, 'email' => $email, 'password' => Str::random(64)],
                'active',
                verified: true,
            );
            // Count creations only, not sign-ins.
            if ($limitKey !== null) {
                RateLimiter::hit($limitKey, 86400);
            }
            RateLimiter::hit('google-signup:all', 3600);

            return $created;
        } catch (ValidationException) {
            // Lost a race with another sign-in for the same email: use the account that won.
            $user = $existing();

            return $user && $user->status === 'active' ? $user->load('roles') : null;
        }
    }

    /** Per-IP counter key, or null when the address is missing or internal (a proxy IP would make the limit global). */
    private function googleSignupLimitKey(?string $ip): ?string
    {
        $public = $ip !== null && filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) !== false;

        return $public ? 'google-signup:'.$ip : null;
    }

    private function googleDomainAllowed(string $email): bool
    {
        $allowed = array_filter(array_map('trim', explode(',', Str::lower((string) config('services.google.allowed_domains')))));
        if ($allowed === []) {
            return true;
        }

        $domain = Str::after($email, '@');
        foreach ($allowed as $pattern) {
            $matches = str_starts_with($pattern, '*.') ? str_ends_with($domain, substr($pattern, 1)) : $domain === $pattern;
            if ($matches) {
                return true;
            }
        }

        return false;
    }

    /** Starts the cookie session for the web app: login, fresh session id, absolute-lifetime stamp, password hash. */
    public function startWebSession(Request $request, User $user): void
    {
        $guard = Auth::guard('web');
        $guard->login($user);
        $request->session()->regenerate();
        $request->session()->put('login_at', time());
        // Same value Sanctum's AuthenticateSession compares: a password change made before this
        // session's first request must still end the session.
        $request->session()->put('password_hash_web', method_exists($guard, 'hashPasswordForCookie')
            ? $guard->hashPasswordForCookie($user->getAuthPassword())
            : $user->getAuthPassword());
    }

    private function createWithDefaultRole(array $attributes, string $status, bool $verified = false): User
    {
        try {
            return $this->database->transaction(function () use ($attributes, $status, $verified): User {
                $user = new User([
                    'name' => $attributes['name'],
                    'email' => $attributes['email'],
                    'password' => $attributes['password'],
                ]);
                $user->status = $status;
                if ($verified) {
                    $user->email_verified_at = now();
                }
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

    /** @return array<string, User|NewAccessToken|null> user and access token (null for cookie-session callers) */
    public function login(string $email, string $password, bool $issueToken = true): array
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
        return $this->database->transaction(function () use ($candidate, $invalid, $issueToken): array {
            $user = User::query()->whereKey($candidate->getKey())->lockForUpdate()->first();

            if (! $user || $user->status !== 'active' || $user->password !== $candidate->password) {
                throw $invalid();
            }

            return [
                'user' => $user->load('roles'),
                'token' => $issueToken ? $user->createToken('web') : null,
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
