<?php

namespace App\Services\AI;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use RuntimeException;

class AgentAiClient
{
    public function post(string $path, array $payload): array
    {
        $url = (string) config('services.ai.url', '');
        $token = (string) config('services.ai.token', '');
        if ($url === '' || $token === '') {
            throw new RuntimeException('AI agent is temporarily unavailable.', 503);
        }

        $incomingId = request()->header('X-Request-ID');
        $requestId = is_string($incomingId) && Str::isUuid($incomingId)
            ? (string) Str::lower($incomingId) : (string) Str::uuid();
        $started = microtime(true);

        try {
            $response = Http::withHeaders(['X-Service-Token' => $token, 'X-Request-ID' => $requestId])
                ->timeout(75)->post(rtrim($url, '/').$path, $payload);
        } catch (ConnectionException $exception) {
            Log::warning('ai.agent_failed', ['request_id' => $requestId, 'category' => 'connection',
                'duration_ms' => (int) ((microtime(true) - $started) * 1000)]);
            throw new RuntimeException('AI agent is temporarily unavailable.', 503, $exception);
        }

        if ($response->failed()) {
            $status = in_array($response->status(), [503, 504], true) ? $response->status() : 502;
            Log::warning('ai.agent_failed', ['request_id' => $requestId, 'category' => 'upstream',
                'status' => $response->status(), 'duration_ms' => (int) ((microtime(true) - $started) * 1000)]);
            throw new RuntimeException('AI agent is temporarily unavailable.', $status);
        }

        $result = $response->json();
        if (! is_array($result)) {
            throw new RuntimeException('AI agent returned an invalid response.', 502);
        }
        Log::info('ai.agent_completed', ['request_id' => $requestId,
            'duration_ms' => (int) ((microtime(true) - $started) * 1000)]);
        return $result;
    }
}
