<?php

return [
    // Hosts whose requests get a cookie session (the web app origin, e.g. localhost:3000).
    'stateful' => explode(',', env('SANCTUM_STATEFUL_DOMAINS', 'localhost:3000,127.0.0.1:3000')),
    // Served under /api so the frontend's existing /api proxy also forwards it.
    'prefix' => env('SANCTUM_PREFIX', 'api/sanctum'),
    'guard' => ['web'],
    // AUTH-06: bearer tokens live at most 12 hours (minutes).
    'expiration' => 720,
    'token_prefix' => env('SANCTUM_TOKEN_PREFIX', ''),
    'middleware' => [
        'authenticate_session' => Laravel\Sanctum\Http\Middleware\AuthenticateSession::class,
        'encrypt_cookies' => Illuminate\Cookie\Middleware\EncryptCookies::class,
        'validate_csrf_token' => Illuminate\Foundation\Http\Middleware\ValidateCsrfToken::class,
    ],
    'personal_access_token_model' => App\Models\PersonalAccessToken::class,
];