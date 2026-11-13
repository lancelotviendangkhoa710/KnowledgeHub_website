<?php

use App\Http\Middleware\EnforceSessionPolicy;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        // Behind a proxy (Next.js /api rewrite, nginx) the client IP is only visible in X-Forwarded-For.
        // List the proxy addresses (comma separated, CIDR allowed) in TRUSTED_PROXIES; never trust "*"
        // when the API is reachable directly, a client could then fake its IP. Empty = trust none.
        // Set it as a real process environment variable (Compose environment/env_file, Render): with a cached
        // config (config:cache) the .env file is not read, and this runs before config() is available.
        $trusted = array_values(array_filter(array_map('trim', explode(',', (string) env('TRUSTED_PROXIES')))));
        $middleware->trustProxies(at: $trusted ?: null);

        $middleware->statefulApi();
        $middleware->appendToGroup('api', EnforceSessionPolicy::class);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        // API clients get a stable, model-agnostic 404 instead of Laravel's raw
        // "No query results for model [...]" message. Web behaviour is unchanged.
        $exceptions->render(function (NotFoundHttpException $exception, Request $request) {
            if (! $exception->getPrevious() instanceof ModelNotFoundException) {
                return null;
            }

            if (! $request->is('api/*') && ! $request->expectsJson()) {
                return null;
            }

            return response()->json([
                'status' => 'error',
                'code' => 'not_found',
                'message' => 'Resource not found.',
            ], 404);
        });
    })->create();
