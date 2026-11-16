<?php

namespace App\Services\AI;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
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

        try {
            $response = Http::withHeader('X-Service-Token', $token)
                ->timeout(75)->post(rtrim($url, '/').$path, $payload);
        } catch (ConnectionException $exception) {
            Log::warning('ai.agent_failed', ['category' => 'connection']);
            throw new RuntimeException('AI agent is temporarily unavailable.', 503, $exception);
        }

        if ($response->failed()) {
            $status = in_array($response->status(), [503, 504], true) ? $response->status() : 502;
            Log::warning('ai.agent_failed', ['category' => 'upstream', 'status' => $response->status()]);
            throw new RuntimeException('AI agent is temporarily unavailable.', $status);
        }

        $result = $response->json();
        if (! is_array($result)) {
            throw new RuntimeException('AI agent returned an invalid response.', 502);
        }
        return $result;
    }
}
