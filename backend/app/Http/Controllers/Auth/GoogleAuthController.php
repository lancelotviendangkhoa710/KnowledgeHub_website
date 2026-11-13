<?php

namespace App\Http\Controllers\Auth;

use App\Exceptions\Auth\GoogleSignInRefused;
use App\Http\Controllers\Controller;
use App\Services\Auth\AuthService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Laravel\Socialite\Facades\Socialite;
use Throwable;

/**
 * AUTH-07: "Continue with Google". Browser navigations (not XHR), so they live in routes/web.php
 * where the session middleware always runs. Redirects are relative on purpose: behind the Next.js
 * /api proxy this app does not know its public host. The login page forwards signed-in visitors.
 * Which Google identities may sign in is decided by AuthService::userForGoogle, not here.
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

        try {
            $user = $this->authService->userForGoogle(
                (string) $google->getEmail(),
                (string) ($google->getName() ?: $google->getEmail()),
                filter_var($google->user['email_verified'] ?? false, FILTER_VALIDATE_BOOLEAN),
                $google->user['hd'] ?? null,
                $request->ip(),
            );
        } catch (GoogleSignInRefused $refused) {
            return $this->toLogin($refused->reason);
        }

        $this->authService->startWebSession($request, $user);

        return $this->toLogin();
    }

    private function toLogin(?string $error = null): RedirectResponse
    {
        return new RedirectResponse($error ? '/login?error='.$error : '/login');
    }
}
