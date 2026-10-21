<?php

namespace App\Providers;

use App\Models\PersonalAccessToken;
use Illuminate\Support\ServiceProvider;
use Laravel\Sanctum\Sanctum;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // The personal_access_tokens table uses UUID primary keys. Sanctum's
        // default model expects an integer key, so the UUID model must be
        // registered explicitly for standard "id|plain" tokens to resolve.
        Sanctum::usePersonalAccessTokenModel(PersonalAccessToken::class);
    }
}
