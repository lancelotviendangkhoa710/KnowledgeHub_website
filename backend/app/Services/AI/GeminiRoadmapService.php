<?php

namespace App\Services\AI;

use Illuminate\Support\Facades\Http;
use RuntimeException;

class GeminiRoadmapService
{
    public function generate(array $input): array
    {
        $apiKey = (string) env('GEMINI_API_KEY', '');
        $model = (string) env('AI_MODEL', 'gemini-2.5-flash');

        if ($apiKey === '') {
            throw new RuntimeException('Gemini API key is not configured.');
        }

        try {
            $response = Http::withHeaders([
                'x-goog-api-key' => $apiKey,
                'Content-Type' => 'application/json',
            ])->timeout(35)->post(
                "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent",
                [
                    'contents' => [[
                        'role' => 'user',
                        'parts' => [['text' => $this->prompt($input)]],
                    ]],
                    'generationConfig' => [
                        'temperature' => 0.2,
                        'responseMimeType' => 'application/json',
                        'responseSchema' => $this->schema(),
                    ],
                ],
            );
            $response->throw();
        } catch (\Throwable $exception) {
            throw new RuntimeException('Gemini request failed.', 0, $exception);
        }

        $text = data_get($response->json(), 'candidates.0.content.parts.0.text');
        $roadmap = is_string($text) ? json_decode($text, true) : null;
        if (! is_array($roadmap)) {
            throw new RuntimeException('Gemini returned invalid roadmap JSON.');
        }

        return $this->normalize($roadmap);
    }

    private function prompt(array $input): string
    {
        return implode("\n", [
            'You are KnowledgeHub learning roadmap planner.',
            'Create a practical learning roadmap from the user goal.',
            'Return only JSON matching the supplied schema. Do not use markdown.',
            'Do not invent course IDs. article_id must always be null because the course catalog is not connected yet.',
            'Use 4 to 12 ordered learning steps. Each step must be a concrete skill or project.',
            'User goal: '.$input['goal'],
            'Current level: '.$input['level'],
            'Available duration in weeks: '.$input['weeks'],
            'Available hours per week: '.$input['hours_per_week'],
        ]);
    }

    private function schema(): array
    {
        return [
            'type' => 'OBJECT',
            'properties' => [
                'title' => ['type' => 'STRING'],
                'summary' => ['type' => 'STRING'],
                'items' => [
                    'type' => 'ARRAY',
                    'minItems' => 4,
                    'maxItems' => 12,
                    'items' => [
                        'type' => 'OBJECT',
                        'properties' => [
                            'position' => ['type' => 'INTEGER'],
                            'title' => ['type' => 'STRING'],
                            'description' => ['type' => 'STRING'],
                            'skills' => ['type' => 'ARRAY', 'items' => ['type' => 'STRING']],
                            'article_id' => ['type' => 'NULL'],
                        ],
                        'required' => ['position', 'title', 'description', 'skills', 'article_id'],
                    ],
                ],
            ],
            'required' => ['title', 'summary', 'items'],
        ];
    }

    private function normalize(array $roadmap): array
    {
        $items = $roadmap['items'] ?? null;
        if (! is_string($roadmap['title'] ?? null)
            || ! is_string($roadmap['summary'] ?? null)
            || ! is_array($items)
            || count($items) < 1
        ) {
            throw new RuntimeException('Gemini returned an incomplete roadmap.');
        }

        $normalizedItems = [];
        foreach (array_values($items) as $index => $item) {
            if (! is_array($item)
                || ! is_string($item['title'] ?? null)
                || ! is_string($item['description'] ?? null)
                || ! is_array($item['skills'] ?? null)
            ) {
                throw new RuntimeException('Gemini returned an invalid roadmap item.');
            }

            $normalizedItems[] = [
                'position' => $index + 1,
                'title' => trim($item['title']),
                'description' => trim($item['description']),
                'skills' => array_values(array_filter($item['skills'], 'is_string')),
                'article_id' => null,
            ];
        }

        return [
            'title' => trim($roadmap['title']),
            'summary' => trim($roadmap['summary']),
            'items' => $normalizedItems,
        ];
    }
}
