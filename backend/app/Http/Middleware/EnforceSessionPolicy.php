<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

/**
 * AUTH-06: limits for cookie sessions (bearer tokens use sanctum.expiration).
 * Idle timeout is the session lifetime; this adds the absolute lifetime and
 * drops sessions whose account is no longer active.
 */
class EnforceSessionPolicy
{
    public const ABSOLUTE_LIFETIME_SECONDS = 12 * 3600;

    public function handle(Request $request, Closure $next): Response
    {
        if ($request->hasSession() && Auth::guard('web')->check()) {
            $user = Auth::guard('web')->user();
            $loginAt = (int) $request->session()->get('login_at', 0);

            if ($user->status !== 'active' || time() - $loginAt > self::ABSOLUTE_LIFETIME_SECONDS) {
                Auth::guard('web')->logout();
                $request->session()->invalidate();

                return response()->json(['status' => 'error', 'message' => 'Unauthenticated.'], 401);
            }
        }

        return $next($request);
    }
}
