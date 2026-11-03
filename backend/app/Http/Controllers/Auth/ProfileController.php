<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\ChangePasswordRequest;
use App\Http\Requests\Auth\DeleteAccountRequest;
use App\Http\Requests\Auth\UpdateProfileRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Services\Auth\ProfileService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Self-service profile (AUTH-02). The target is always the authenticated user;
 * no user id is ever accepted from the client.
 */
class ProfileController extends Controller
{
    public function __construct(private ProfileService $profileService) {}

    public function show(Request $request): JsonResponse
    {
        $this->authorize('viewProfile', User::class);

        return response()->json([
            'status' => 'success',
            'data' => ['user' => new UserResource($request->user()->load('roles'))],
        ]);
    }

    public function update(UpdateProfileRequest $request): JsonResponse
    {
        $user = $this->profileService->update($request->user(), $request->validated());

        return response()->json([
            'status' => 'success',
            'message' => 'Profile updated.',
            'data' => ['user' => new UserResource($user)],
        ]);
    }

    public function changePassword(ChangePasswordRequest $request): JsonResponse
    {
        $this->profileService->changePassword(
            $request->user(),
            $request->validated('current_password'),
            $request->validated('password'),
        );

        return response()->json([
            'status' => 'success',
            'message' => 'Password changed. Other sessions were signed out.',
            'data' => null,
        ]);
    }

    public function destroy(DeleteAccountRequest $request): JsonResponse
    {
        $this->profileService->deleteAccount($request->user(), $request->validated('current_password'));

        return response()->json([
            'status' => 'success',
            'message' => 'Account deleted.',
            'data' => null,
        ]);
    }
}
