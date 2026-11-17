<?php

namespace App\Services\AI;

use App\Exceptions\AI\AgentServiceException;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class AgentAiClient
{
    public function post(string $path, array $payload): array
    {
        $url = AiServiceUrl::configured();
        $token = (string) config('services.ai.token', '');
        if ($url === '' || $token === '') {
            throw new AgentServiceException('AI agent is temporarily unavailable.', 503);
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
            throw new AgentServiceException('AI agent is temporarily unavailable.', 503, null, $exception);
        }

        if ($response->failed()) {
            $upstream = $response->status();
            $detail = $response->json('detail');
            $code = is_array($detail) && is_string($detail['code'] ?? null) ? $detail['code'] : null;
            // A refused source is the caller's input problem; anything else is
            // an upstream outage. Keep both explicit instead of one 5xx blanket.
            $status = match (true) {
                $upstream === 422 => 422,
                in_array($upstream, [503, 504], true) => $upstream,
                default => 502,
            };
            Log::warning('ai.agent_failed', ['request_id' => $requestId, 'category' => 'upstream',
                'status' => $upstream, 'duration_ms' => (int) ((microtime(true) - $started) * 1000)]);
            throw new AgentServiceException('AI agent is temporarily unavailable.', $status, $code);
        }

        $result = $response->json();
        if (! is_array($result)) {
            throw new AgentServiceException('AI agent returned an invalid response.', 502);
        }
        Log::info('ai.agent_completed', ['request_id' => $requestId,
            'duration_ms' => (int) ((microtime(true) - $started) * 1000)]);
        return $result;
    }
}
