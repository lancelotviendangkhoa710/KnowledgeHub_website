<?php

namespace App\Services\AI;

use RuntimeException;
use Throwable;

class CvCleanupException extends RuntimeException
{
    public function __construct(?Throwable $previous = null)
    {
        parent::__construct('CV cleanup is temporarily unavailable. Please retry.', 503, $previous);
    }
}
