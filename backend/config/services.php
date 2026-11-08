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
        'chat_timeout' => (int) env('AI_CHAT_TIMEOUT', 40),
        'chat_history_limit' => (int) env('AI_CHAT_HISTORY_LIMIT', 20),
        'chat_memory_limit' => (int) env('AI_CHAT_MEMORY_LIMIT', 10),
    ],

];
