<?php

namespace App\Services\AI;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use RuntimeException;

class CompanionRoadmapAiClient
{
    public function extractPdf(UploadedFile $file): string
    {
        $url = (string) config('services.ai.url', '');
        $token = (string) config('services.ai.token', '');
        if ($url === '' || $token === '') {
            throw new RuntimeException('CV analysis is temporarily unavailable.', 503);
        }
        $path = $file->getRealPath();
        if ($path === false) {
            throw ValidationException::withMessages(['cv_file' => 'The uploaded PDF could not be read.']);
        }
        $stream = fopen($path, 'rb');
        if ($stream === false) {
            throw ValidationException::withMessages(['cv_file' => 'The uploaded PDF could not be read.']);
        }
        try {
            if (fread($stream, 5) !== '%PDF-') {
                throw ValidationException::withMessages(['cv_file' => 'The CV must be a valid PDF.']);
            }
            rewind($stream);
            $response = Http::withHeader('X-Service-Token', $token)->timeout(30)
                ->attach('file', $stream, 'cv.pdf', ['Content-Type' => 'application/pdf'])
                ->post(rtrim($url, '/').'/v1/roadmaps/cv/extract');
        } catch (ConnectionException $exception) {
            Log::warning('ai.cv_extract_failed', ['category' => 'connection']);
            throw new RuntimeException('CV analysis is temporarily unavailable.', 503, $exception);
        } finally {
            fclose($stream);
        }
        if ($response->status() === 422) {
            throw ValidationException::withMessages(['cv_file' => 'The PDF has no extractable text or exceeds the supported limit.']);
        }
        if ($response->failed()) {
            Log::warning('ai.cv_extract_failed', ['category' => 'service', 'status' => $response->status()]);
            throw new RuntimeException('CV analysis is temporarily unavailable.', 503);
        }
        $text = $response->json('text');
        if (! is_string($text) || trim($text) === '' || mb_strlen($text) > 12000) {
            throw new RuntimeException('CV analysis returned an invalid response.', 502);
        }
        return $text;
    }

    public function post(string $path, array $payload): array
    {
        $url = (string) config('services.ai.url', '');
        $token = (string) config('services.ai.token', '');
        if ($url === '' || $token === '') {
            throw new RuntimeException('Roadmap generation is temporarily unavailable.', 503);
        }

        try {
            $response = Http::withHeader('X-Service-Token', $token)
                ->timeout(45)
                ->post(rtrim($url, '/').$path, $payload);
        } catch (ConnectionException $exception) {
            Log::warning('ai.roadmap_service_failed', ['category' => 'connection']);
            throw new RuntimeException('Roadmap generation is temporarily unavailable.', 503, $exception);
        }

        if ($response->failed()) {
            $status = $response->status() === 504 ? 504 : ($response->status() === 503 ? 503 : 502);
            Log::warning('ai.roadmap_service_failed', ['category' => 'upstream', 'status' => $response->status()]);
            throw new RuntimeException(match ($status) {
                504 => 'Roadmap generation timed out. Please retry.',
                503 => 'Roadmap generation is temporarily unavailable.',
                default => 'Roadmap generation failed. Please retry.',
            }, $status);
        }

        $data = $response->json();
        if (! is_array($data)) {
            throw new RuntimeException('Roadmap generation returned an invalid response.', 502);
        }

        return $data;
    }
}
