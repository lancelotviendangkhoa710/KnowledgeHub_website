<?php

namespace App\Http\Controllers\Auth;

use App\Exceptions\Auth\GoogleDomainNotAllowed;
use App\Exceptions\Auth\GoogleSignupLimitReached;
use App\Http\Controllers\Controller;
use App\Services\Auth\AuthService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Laravel\Socialite\Facades\Socialite;
use Throwable;

/**
 * AUTH-07: "Continue with Google". Browser navigations (not XHR), so they live in routes/web.php
 * where the session middleware always runs. Redirects are relative on purpose: behind the Next.js
 * /api proxy this app does not know its public host. The login page forwards signed-in visitors.
 */
class GoogleAuthController extends Controller
{
    public function __construct(private AuthService $authService) {}

    public function redirect(): RedirectResponse
    {
        if (! config('services.google.client_id')) {
            return $this->toLogin('google_not_configured');
        }

        return Socialite::driver('google')->redirect();
    }

    public function callback(Request $request): RedirectResponse
    {
        try {
            $google = Socialite::driver('google')->user();
        } catch (Throwable) {
            return $this->toLogin('google_failed'); // denied consent, expired state, Google outage
        }

        $verified = filter_var($google->user['email_verified'] ?? false, FILTER_VALIDATE_BOOLEAN);
        if (! $google->getEmail() || ! $verified) {
            return $this->toLogin('google_unverified');
        }

        try {
            $user = $this->authService->userForGoogle($google->getEmail(), $google->getName() ?: $google->getEmail(), $request->ip());
        } catch (GoogleDomainNotAllowed) {
            // Domain only (no personal data): tells the operator what to add to GOOGLE_ALLOWED_DOMAINS.
            Log::notice('Google sign-up refused: email domain not allowed', ['domain' => Str::after($google->getEmail(), '@')]);

            return $this->toLogin('google_domain_not_allowed');
        } catch (GoogleSignupLimitReached) {
            return $this->toLogin('google_too_many_signups');
        }
        if ($user === null) {
            return $this->toLogin('google_unavailable'); // existing account that is not active
        }

        $this->authService->startWebSession($request, $user);

        return $this->toLogin();
    }

    private function toLogin(?string $error = null): RedirectResponse
    {
        return new RedirectResponse($error ? '/login?error='.$error : '/login');
    }
}
