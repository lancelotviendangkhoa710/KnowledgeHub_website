<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Models\User;
use App\Services\Auth\AuthService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful;
use Laravel\Sanctum\TransientToken;

class AuthController extends Controller
{
    public function __construct(private AuthService $authService) {}

    public function register(RegisterRequest $request): JsonResponse
    {
        $this->authorize('register', User::class);

        $user = $this->authService->register($request->validated());

        return response()->json([
            'status' => 'success',
            'message' => 'Account created. It is pending verification before sign in.',
            'data' => ['user' => $this->userData($user)],
        ], 201);
    }

    public function login(LoginRequest $request): JsonResponse
    {
        $this->authorize('login', User::class);

        $result = $this->authService->login(
            $request->validated('email'),
            $request->validated('password'),
            ! $this->isCookieSession($request),
        );

        // Web app (stateful request): the session cookie is the credential, no token in JSON.
        if ($this->isCookieSession($request)) {
            $guard = Auth::guard('web');
            $guard->login($result['user']);
            $request->session()->regenerate();
            // Same value Sanctum's AuthenticateSession compares: a password change made before this
            // session's first request must still end the session.
            $request->session()->put('password_hash_web', method_exists($guard, 'hashPasswordForCookie')
                ? $guard->hashPasswordForCookie($result['user']->getAuthPassword())
                : $result['user']->getAuthPassword());
            $request->session()->put('login_at', time());
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Signed in successfully.',
            'data' => array_filter([
                'user' => $this->userData($result['user']),
                'token' => $result['token']?->plainTextToken,
            ]),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $this->authorize('logout', User::class);

        // Decide by the credential that authenticated this request, not by Origin: a bearer token
        // sent from a stateful origin must still be revoked.
        if ($request->hasSession() && $request->user()->currentAccessToken() instanceof TransientToken) {
            Auth::guard('web')->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        } else {
            $this->authService->logout($request->user(), $request->bearerToken());
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Signed out successfully.',
            'data' => null,
        ]);
    }

    private function isCookieSession(Request $request): bool
    {
        return $request->hasSession() && EnsureFrontendRequestsAreStateful::fromFrontend($request);
    }

    private function userData(object $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'status' => $user->status,
            'roles' => $user->roles->pluck('name')->values()->all(),
        ];
    }
}
