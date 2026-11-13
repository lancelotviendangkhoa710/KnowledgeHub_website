<?php

namespace App\Providers;

use App\Models\LearningRoadmap;
use App\Models\PersonalAccessToken;
use App\Models\RoadmapItem;
use App\Models\User;
use App\Policies\RoadmapPolicy;
use App\Policies\UserPolicy;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
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

        // Identity/Auth (AUTH-01): UserPolicy holds the guest-only rules for the
        // public register/login endpoints and the current-token rule for logout.
        Gate::policy(User::class, UserPolicy::class);

        // Identity/Auth (AUTH-01): throttle password guessing per account+source
        // pair, plus a coarser cap per source address across all accounts.
        RateLimiter::for('auth-login', function (Request $request) {
            $email = strtolower(trim((string) $request->input('email')));
            $ip = (string) $request->ip();

            $limits = [Limit::perMinute(5)->by('auth-login:account:'.$email.'|'.$ip)];

            // The per-address cap only makes sense for a real client address. Behind a proxy that does not
            // forward the client IP (the Next.js /api rewrite) every visitor shares one internal address,
            // and the cap would become 25 logins per minute for the whole site. The per-account limit above
            // still stops password guessing; for a per-address cap list the edge proxy in TRUSTED_PROXIES.
            if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) !== false) {
                $limits[] = Limit::perMinute(25)->by('auth-login:ip:'.$ip);
            }

            return $limits;
        });
    }
}
