<?php

use App\Http\Controllers\Auth\AdminUserController;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\Auth\ProfileController;
use Illuminate\Support\Facades\Route;

// Identity/Auth - TEAM_MEMBER_A (AUTH-01)
Route::post('/auth/register', [AuthController::class, 'register']);
Route::post('/auth/login', [AuthController::class, 'login'])
    ->middleware('throttle:auth-login');
Route::post('/auth/logout', [AuthController::class, 'logout'])
    ->middleware('auth:sanctum');

// Identity/Auth - TEAM_MEMBER_A (AUTH-02 profile)
Route::middleware('auth:sanctum')->prefix('me')->group(function () {
    Route::get('/', [ProfileController::class, 'show']);
    Route::patch('/', [ProfileController::class, 'update']);
    Route::delete('/', [ProfileController::class, 'destroy'])->middleware('throttle:6,1');
    Route::put('/password', [ProfileController::class, 'changePassword'])->middleware('throttle:6,1');
});

// Identity/Auth - TEAM_MEMBER_A (AUTH-02 admin user management)
Route::middleware('auth:sanctum')->prefix('admin/users')->group(function () {
    Route::get('/', [AdminUserController::class, 'index']);
    Route::get('/{user}', [AdminUserController::class, 'show'])->whereUuid('user');
    Route::patch('/{user}/status', [AdminUserController::class, 'updateStatus'])->whereUuid('user');
    // Granting/revoking admin checks the actor's password, so cap guessing like PUT /me/password.
    Route::put('/{user}/role', [AdminUserController::class, 'updateRole'])->whereUuid('user')->middleware('throttle:6,1');
});
