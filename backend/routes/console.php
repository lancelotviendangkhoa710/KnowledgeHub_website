<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// AI Companion retention (ADR-C): purge AI rows for accounts deleted > 30 days ago.
// Requires a running scheduler on the host (e.g. Render Cron Job running `php artisan schedule:run`).
Schedule::command('ai:purge-deleted-users')->dailyAt('03:00');
