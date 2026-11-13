<?php

use App\Http\Controllers\Auth\GoogleAuthController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

// AUTH-07: Google sign-in. Paths sit under /api so the frontend's existing /api proxy forwards them.
Route::prefix('api/auth/google')->group(function () {
    Route::get('redirect', [GoogleAuthController::class, 'redirect']);
    // No per-IP throttle: behind the proxy every visitor shares one IP, so it would let anyone block everyone.
    // A bad callback is rejected on the OAuth state before any call to Google; sign-ups have their own limits.
    Route::get('callback', [GoogleAuthController::class, 'callback']);
});
