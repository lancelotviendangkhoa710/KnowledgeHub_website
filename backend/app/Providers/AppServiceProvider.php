<?php

namespace App\Providers;

use App\Models\LearningRoadmap;
use App\Models\PersonalAccessToken;
use App\Models\RoadmapItem;
use App\Policies\RoadmapPolicy;
use Illuminate\Support\Facades\Gate;
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

        // Laravel's policy auto-discovery maps LearningRoadmap -> LearningRoadmapPolicy,
        // which does not exist, so both Learning models must be mapped explicitly or
        // Gate::authorize() would fail with an authorization exception.
        Gate::policy(LearningRoadmap::class, RoadmapPolicy::class);
        Gate::policy(RoadmapItem::class, RoadmapPolicy::class);
    }
}
