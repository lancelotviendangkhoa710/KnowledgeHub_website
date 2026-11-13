<?php

use App\Http\Controllers\Auth\GoogleAuthController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

// AUTH-07: Google sign-in. Paths sit under /api so the frontend's existing /api proxy forwards them.
Route::prefix('api/auth/google')->group(function () {
    Route::get('redirect', [GoogleAuthController::class, 'redirect']);
    Route::get('callback', [GoogleAuthController::class, 'callback'])->middleware('throttle:20,1');
});
