<?php

namespace App\Http\Controllers\AI;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\RateLimiter;
use Throwable;

/**
 * Internal retention endpoint for hosts without a scheduler/shell.
 *
 * Protected by a dedicated shared secret (`RETENTION_CRON_TOKEN`) sent in the
 * `X-Retention-Token` header, with a small per-IP rate limit. Not part of the
 * public API; the caller should be a cron service (GitHub Actions/cron-job.org)
 * or an operator.
 */
class RetentionPurgeController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $expected = (string) config('services.ai.retention_token', '');
        if ($expected === '') {
            return response()->json([
                'status' => 'error',
                'message' => 'Retention endpoint is not configured.',
            ], 503);
        }

        $key = 'retention-purge:'.$request->ip();
        if (RateLimiter::tooManyAttempts($key, 6)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Too many retention requests. Please retry later.',
            ], 429)->header('Retry-After', (string) RateLimiter::availableIn($key));
        }
        RateLimiter::hit($key, 60);

        $provided = (string) $request->header('X-Retention-Token', '');
        if ($provided === '' || ! hash_equals($expected, $provided)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Unauthorized.',
            ], 401);
        }

        try {
            $exitCode = Artisan::call('ai:purge-deleted-users');
            $output = trim(Artisan::output());
        } catch (Throwable $exception) {
            // Do not log request headers/token; only the failure type.
            Log::error('retention.purge_failed', ['exception' => $exception::class]);

            return response()->json([
                'status' => 'error',
                'message' => 'Retention purge failed. Check server logs.',
            ], 500);
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Retention purge completed.',
            'data' => [
                'exit_code' => $exitCode,
                'output' => $output,
            ],
        ]);
    }
}
