<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Models\User;
use App\Services\Auth\AuthService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

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
        );

        return response()->json([
            'status' => 'success',
            'message' => 'Signed in successfully.',
            'data' => [
                'user' => $this->userData($result['user']),
                'token' => $result['token']->plainTextToken,
            ],
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $this->authorize('logout', User::class);

        $this->authService->logout($request->user(), $request->bearerToken());

        return response()->json([
            'status' => 'success',
            'message' => 'Signed out successfully.',
            'data' => null,
        ]);
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
