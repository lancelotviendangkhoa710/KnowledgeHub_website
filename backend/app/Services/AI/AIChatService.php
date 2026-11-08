<?php

namespace App\Services\AI;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class AIChatService
{
    /** Metadata keys the AI service is allowed to return to us (ADR-A D4 whitelist). */
    private const ALLOWED_META_KEYS = ['provider', 'configured_model', 'model_version'];

    /**
     * Request one synchronous companion reply from the private AI service.
     *
     * @param  list<array{role: string, content: string}>  $messages
     * @param  list<string>  $memory
     * @return array{content: string, meta: array<string, string|null>}
     */
    public function reply(array $messages, array $memory = []): array
    {
        $url = (string) config('services.ai.url', '');
        $token = (string) config('services.ai.token', '');
        if ($url === '' || $token === '') {
            throw new RuntimeException('AI Companion is temporarily unavailable.', 503);
        }

        try {
            $response = Http::withHeader('X-Service-Token', $token)
                ->timeout((int) config('services.ai.chat_timeout', 40))
                ->post(rtrim($url, '/').'/v1/chat', [
                    'messages' => array_values($messages),
                    'memory' => array_values($memory),
                ]);
        } catch (ConnectionException $exception) {
            Log::warning('ai.chat_request_failed', ['provider' => 'fastapi', 'category' => 'service_connection']);
            throw new RuntimeException('AI Companion is temporarily unavailable.', 502, $exception);
        }

        if ($response->failed()) {
            $detail = $response->json('detail');
            $category = is_array($detail) && is_string($detail['code'] ?? null) ? $detail['code'] : 'service_error';
            $requestId = is_array($detail) && is_string($detail['request_id'] ?? null) ? $detail['request_id'] : null;
            // Diagnostics only: never log message content, headers, or provider bodies.
            Log::warning('ai.chat_request_failed', [
                'provider' => 'fastapi', 'category' => $category, 'status' => $response->status(), 'request_id' => $requestId,
            ]);

            $status = match ($response->status()) {
                401, 503 => 503,
                504 => 504,
                default => 502,
            };
            throw new RuntimeException(match ($status) {
                503 => 'AI Companion is temporarily unavailable.',
                504 => 'AI Companion timed out. Please retry.',
                default => 'AI Companion failed to reply. Please retry.',
            }, $status);
        }

        $payload = $response->json();
        $reply = is_array($payload) ? ($payload['reply'] ?? null) : null;
        $content = is_array($reply) && is_string($reply['content'] ?? null) ? trim($reply['content']) : '';
        if ($content === '' || mb_strlen($content) > 16000) {
            Log::warning('ai.chat_response_invalid', ['provider' => 'fastapi']);
            throw new RuntimeException('AI Companion returned an invalid response.', 502);
        }

        $meta = [];
        if (is_array($payload) && is_array($payload['meta'] ?? null)) {
            foreach (self::ALLOWED_META_KEYS as $key) {
                $value = $payload['meta'][$key] ?? null;
                if (is_string($value) && $value !== '') {
                    $meta[$key] = $value;
                }
            }
        }

        return ['content' => $content, 'meta' => $meta];
    }
}
