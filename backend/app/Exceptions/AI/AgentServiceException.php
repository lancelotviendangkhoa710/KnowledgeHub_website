<?php

namespace App\Exceptions\AI;

use RuntimeException;
use Throwable;

/**
 * Upstream agent workflow failure carrying the HTTP status the controller may
 * return and the safe machine code the AI service reported.
 */
class AgentServiceException extends RuntimeException
{
    public function __construct(string $message, public readonly int $status,
        public readonly ?string $upstreamCode = null, ?Throwable $previous = null)
    {
        parent::__construct($message, $status, $previous);
    }
}
