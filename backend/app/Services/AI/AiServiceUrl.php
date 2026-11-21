<?php

namespace App\Services\AI;

/**
 * Resolves the private AI service base URL and refuses transports that would
 * expose the service token over plaintext HTTP outside local development.
 */
final class AiServiceUrl
{
    /** Configured base URL, or an empty string when absent or insecure here. */
    public static function configured(): string
    {
        $url = (string) config('services.ai.url', '');
        if ($url === '') {
            return '';
        }
        $scheme = strtolower((string) parse_url($url, PHP_URL_SCHEME));
        $allowed = app()->environment('local', 'testing') ? ['http', 'https'] : ['https'];

        return in_array($scheme, $allowed, true) ? $url : '';
    }
}
