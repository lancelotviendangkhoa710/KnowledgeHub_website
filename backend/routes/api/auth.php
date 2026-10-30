<?php

use App\Http\Controllers\Auth\AuthController;
use Illuminate\Support\Facades\Route;

// Identity/Auth - TEAM_MEMBER_A (AUTH-01)
Route::post('/auth/register', [AuthController::class, 'register']);
Route::post('/auth/login', [AuthController::class, 'login'])
    ->middleware('throttle:auth-login');
Route::post('/auth/logout', [AuthController::class, 'logout'])
    ->middleware('auth:sanctum');
