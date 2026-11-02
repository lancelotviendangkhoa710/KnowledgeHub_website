<?php

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
    Route::put('/password', [ProfileController::class, 'changePassword'])->middleware('throttle:6,1');
});
