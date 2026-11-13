<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'token' => env('POSTMARK_TOKEN'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'resend' => [
        'key' => env('RESEND_KEY'),
    ],

    // AUTH-07: Google sign-in. The redirect URI must be registered in Google Cloud and point at the
    // web origin, e.g. http://localhost:3000/api/auth/google/callback (the /api proxy forwards it).
    'google' => [
        'client_id' => env('GOOGLE_CLIENT_ID'),
        'client_secret' => env('GOOGLE_CLIENT_SECRET'),
        'redirect' => env('GOOGLE_REDIRECT_URI'),
        // Email domains that may CREATE an account through Google (existing active accounts are not
        // restricted). Comma separated; "*.edu" matches any subdomain suffix; empty = no restriction.
        'allowed_domains' => env('GOOGLE_ALLOWED_DOMAINS', 'gmail.com,*.edu,*.edu.vn'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'ai' => [
        'url' => env('AI_SERVICE_URL'),
        'token' => env('AI_SERVICE_TOKEN'),
        // AI-01..03 chat was gated until the privacy/retention decision was approved.
        // Product/operator approval recorded 2026-11-08; enabled by default from this
        // release. Set AI_CHAT_ENABLED=false to disable it again (e.g. staging/incident).
        'chat_enabled' => (bool) env('AI_CHAT_ENABLED', true),
        'chat_timeout' => (int) env('AI_CHAT_TIMEOUT', 75),
        // After migration 2026_11_08_000001 has run everywhere, set AI_MESSAGES_M1=true
        // to skip two information_schema probes per chat request. Null = auto-detect.
        'messages_m1' => env('AI_MESSAGES_M1') === null
            ? null
            : filter_var(env('AI_MESSAGES_M1'), FILTER_VALIDATE_BOOLEAN),
        'chat_history_limit' => (int) env('AI_CHAT_HISTORY_LIMIT', 20),
        'chat_memory_limit' => (int) env('AI_CHAT_MEMORY_LIMIT', 10),
        // Shared secret for the internal retention cron endpoint; empty disables it.
        'retention_token' => env('RETENTION_CRON_TOKEN'),
    ],

];
