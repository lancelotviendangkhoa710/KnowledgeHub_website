<?php

namespace App\Services\Auth;

use App\Exceptions\Auth\GoogleSignInRefused;
use App\Models\PersonalAccessToken;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\DatabaseManager;
use Illuminate\Database\QueryException;
use Illuminate\Hashing\HashManager;
use Illuminate\Http\Request;
use Illuminate\Contracts\Cache\LockTimeoutException;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Laravel\Sanctum\NewAccessToken;
use Throwable;
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
     * AUTH-07: the account for a Google sign-in, or GoogleSignInRefused (its `reason` is shown on the
     * login page). Rules, in order:
     *  1. Google must report the email as verified and (unless switched off) vouch for ownership: a
     *     Gmail address, or one whose domain is the account's hosted domain (`hd`, Google Workspace).
     *     For any other address `email_verified` does not prove the person still owns the mailbox, so
     *     it must not reach an existing account (recycled mailbox, old owner keeps the Google account).
     *  2. An existing active account is reused with its roles; any other status is refused, so Google
     *     cannot lift a ban or skip the admin gate.
     *  3. An unknown email gets a new active account with the default role, but only for an allowed
     *     email domain and under the new-account limits.
     * Linking is by email only (no schema change, see the ADR).
     */
    public function userForGoogle(string $email, string $name, bool $emailVerified, ?string $hostedDomain, ?string $ip = null): User
    {
        // shortcut: linked by email, not Google's stable id; add a google_id column when a schema change is approved.
        $email = Str::lower(trim($email));
        if ($email === '' || ! $emailVerified) {
            throw new GoogleSignInRefused('google_unverified');
        }
        if (! $this->googleVouchesForEmail($email, $hostedDomain)) {
            Log::notice('Google sign-in refused: email not vouched for by Google', ['domain' => Str::after($email, '@')]);
            throw new GoogleSignInRefused('google_email_unconfirmed');
        }

        $existing = fn () => User::query()->where('email', $email)->first();
        if ($user = $existing()) {
            return $this->activeOrRefused($user);
        }

        if (! $this->googleDomainAllowed($email)) {
            // Domain only (no personal data): tells the operator what to add to GOOGLE_ALLOWED_DOMAINS.
            Log::notice('Google sign-up refused: email domain not allowed', ['domain' => Str::after($email, '@')]);
            throw new GoogleSignInRefused('google_domain_not_allowed');
        }

        // Check the limits, create the account and count it as one step: two sign-ups arriving together
        // must not both pass the check at 29 of 30 and leave the counter at 31.
        return $this->withSignupLock(function () use ($email, $name, $ip, $existing): User {
            // A sign-in for the same email may have created the account while we waited for the lock.
            if ($user = $existing()) {
                return $this->activeOrRefused($user);
            }

            $limitKey = $this->googleSignupLimitKey($ip);
            $limit = (int) config('services.google.max_new_accounts_per_ip_per_day');
            $hourly = (int) config('services.google.max_new_accounts_per_hour');
            $tooMany = $this->failOpen(fn () => ($limitKey !== null && $limit > 0 && RateLimiter::tooManyAttempts($limitKey, $limit))
                || ($hourly > 0 && RateLimiter::tooManyAttempts('google-signup:all', $hourly)), false);
            if ($tooMany) {
                throw new GoogleSignInRefused('google_too_many_signups');
            }

            try {
                // Google-only accounts get a random password nobody knows, so password login is impossible.
                $created = $this->createWithDefaultRole(
                    ['name' => $name, 'email' => $email, 'password' => Str::random(64)],
                    'active',
                    verified: true,
                );
                // Count creations only, not sign-ins; nothing was counted if the creation failed.
                $this->failOpen(function () use ($limitKey) {
                    if ($limitKey !== null) {
                        RateLimiter::hit($limitKey, 86400);
                    }
                    RateLimiter::hit('google-signup:all', 3600);
                });

                return $created;
            } catch (ValidationException) {
                // Lost a race with another sign-in for the same email: use the account that won.
                return $this->activeOrRefused($existing() ?? throw new GoogleSignInRefused('google_failed'));
            }
        });
    }

    /** Runs $work with the sign-up lock held. A broken cache must not block sign-in: then it runs unlocked (fail open). */
    private function withSignupLock(callable $work): mixed
    {
        try {
            $lock = Cache::lock('google-signup', 10);
            $lock->block(3);
        } catch (LockTimeoutException) {
            throw new GoogleSignInRefused('google_failed'); // busy for 3 seconds: ask the person to retry
        } catch (Throwable $exception) {
            Log::warning('Google sign-up lock unavailable, not enforced', ['error' => $exception->getMessage()]);

            return $work();
        }

        try {
            return $work();
        } finally {
            try {
                $lock->release();
            } catch (Throwable $exception) {
                // The outcome is already decided; a failed release only means the lock expires on its own (10 s).
                Log::warning('Google sign-up lock release failed', ['error' => $exception->getMessage()]);
            }
        }
    }

    private function activeOrRefused(User $user): User
    {
        if ($user->status !== 'active') {
            throw new GoogleSignInRefused('google_unavailable'); // pending, inactive or banned
        }

        return $user->load('roles');
    }

    /** Gmail, or an address whose domain is the account's hosted domain (`hd`); see config/services.php. */
    private function googleVouchesForEmail(string $email, ?string $hostedDomain): bool
    {
        if (! config('services.google.require_authoritative_email')) {
            return true;
        }

        $domain = Str::after($email, '@');
        $hosted = Str::lower((string) $hostedDomain);

        return in_array($domain, ['gmail.com', 'googlemail.com'], true) || ($hosted !== '' && $hosted === $domain);
    }

    /** Limiter bookkeeping must never break sign-in (cache outage, bad file permissions): fail open and log. */
    private function failOpen(callable $work, mixed $fallback = null): mixed
    {
        try {
            return $work();
        } catch (Throwable $exception) {
            Log::warning('Google sign-up limiter unavailable, not enforced', ['error' => $exception->getMessage()]);

            return $fallback;
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
