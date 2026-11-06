<?php

namespace App\Services\AI;

use App\Models\Article;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class AIRoadmapService
{
    /** Generate and validate a roadmap draft through the private AI service. */
    public function generate(array $input): array
    {
        $url = (string) config('services.ai.url', '');
        $token = (string) config('services.ai.token', '');
        if ($url === '' || $token === '') {
            throw new RuntimeException('AI service is not configured.');
        }

        // This is the complete read-only catalog allowlist sent to the AI service.
        $input['catalog'] = Article::query()->published()
            ->with('publishedVersion:id,article_id,title')
            ->orderBy('id')->limit(100)->get()->map(static fn (Article $article): array => [
                'id' => $article->id,
                'title' => (string) $article->publishedVersion?->title,
            ])->values()->all();

        try {
            $response = Http::withHeader('X-Service-Token', $token)
                ->timeout(40)->post(rtrim($url, '/').'/v1/roadmaps/preview', $input);
        } catch (ConnectionException $exception) {
            Log::warning('ai.provider_request_failed', ['provider' => 'fastapi', 'category' => 'service_connection']);
            throw new RuntimeException('Roadmap generation is temporarily unavailable.', 0, $exception);
        }

        if ($response->failed()) {
            $detail = $response->json('detail');
            $code = is_array($detail) && is_string($detail['code'] ?? null) ? $detail['code'] : 'service_error';
            $requestId = is_array($detail) && is_string($detail['request_id'] ?? null) ? $detail['request_id'] : null;
            Log::warning('ai.provider_request_failed', [
                'provider' => 'fastapi', 'category' => $code, 'status' => $response->status(), 'request_id' => $requestId,
            ]);
            throw new RuntimeException(match ($response->status()) {
                401 => 'AI service authentication is temporarily unavailable.',
                503 => 'Roadmap generation is temporarily unavailable.',
                504 => 'Roadmap generation timed out. Please retry.',
                default => 'Roadmap generation failed. Please retry.',
            }, $response->status() === 401 ? 503 : $response->status());
        }

        $draft = $response->json();
        if (! is_array($draft) || ! is_string($draft['title'] ?? null) || trim($draft['title']) === ''
            || mb_strlen($draft['title']) > 255 || ! is_string($draft['summary'] ?? null)
            || trim($draft['summary']) === '' || mb_strlen($draft['summary']) > 5000
            || ! is_array($draft['items'] ?? null) || ! array_is_list($draft['items'])
            || count($draft['items']) < 4 || count($draft['items']) > 12) {
            Log::warning('ai.provider_response_invalid', ['provider' => 'fastapi']);
            throw new RuntimeException('Roadmap generation returned an invalid response.');
        }

        foreach ($draft['items'] as $item) {
            if (! is_array($item) || ! is_string($item['title'] ?? null) || trim($item['title']) === ''
                || mb_strlen($item['title']) > 255
                || ! is_string($item['description'] ?? null) || ! is_array($item['skills'] ?? null)
                || trim($item['description']) === '' || mb_strlen($item['description']) > 5000
                || ! array_is_list($item['skills']) || count($item['skills']) > 30
                || array_filter($item['skills'], static fn ($skill): bool => ! is_string($skill) || mb_strlen($skill) > 100) !== []) {
                Log::warning('ai.provider_response_invalid', ['provider' => 'fastapi']);
                throw new RuntimeException('Roadmap generation returned an invalid response.');
            }
        }
        $draft['items'] = array_map(static function (array $item, int $index): array {
            return [
                'position' => $index + 1,
                'title' => trim((string) ($item['title'] ?? '')),
                'description' => trim($item['description']),
                'skills' => is_array($item['skills'] ?? null) ? $item['skills'] : [],
                'article_id' => null,
            ];
        }, $draft['items'], array_keys($draft['items']));
        if (! is_array($draft['meta'] ?? null)) {
            unset($draft['meta']);
        }
        return $draft;
    }
}
