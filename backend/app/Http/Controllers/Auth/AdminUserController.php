<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\ListUsersRequest;
use App\Http\Requests\Auth\UpdateUserRoleRequest;
use App\Http\Requests\Auth\UpdateUserStatusRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Services\Auth\AdminUserService;
use Illuminate\Http\JsonResponse;

/** Admin-only user management (AUTH-02). Role assignment is AUTH-03. */
class AdminUserController extends Controller
{
    public function __construct(private AdminUserService $service) {}

    public function index(ListUsersRequest $request): JsonResponse
    {
        $this->authorize('viewAny', User::class);

        $page = $this->service->list($request->validated());

        return response()->json([
            'status' => 'success',
            'data' => UserResource::collection($page->getCollection())->resolve(),
            'meta' => [
                'current_page' => $page->currentPage(),
                'last_page' => $page->lastPage(),
                'per_page' => $page->perPage(),
                'total' => $page->total(),
            ],
        ]);
    }

    public function show(User $user): JsonResponse
    {
        $this->authorize('view', $user);

        return response()->json([
            'status' => 'success',
            'data' => ['user' => new UserResource($user->load('roles'))],
        ]);
    }

    public function updateStatus(UpdateUserStatusRequest $request, User $user): JsonResponse
    {
        $this->authorize('updateStatus', $user);

        $updated = $this->service->changeStatus($user, $request->validated('status'));

        return response()->json([
            'status' => 'success',
            'message' => 'User status updated.',
            'data' => ['user' => new UserResource($updated)],
        ]);
    }

    public function updateRole(UpdateUserRoleRequest $request, User $user): JsonResponse
    {
        $this->authorize('updateRole', $user);

        $updated = $this->service->changeRole(
            $request->user(), $user, $request->validated('role'), $request->validated('current_password'),
        );

        return response()->json([
            'status' => 'success',
            'message' => 'User role updated.',
            'data' => ['user' => new UserResource($updated)],
        ]);
    }
}
