<?php

namespace App\Exceptions\Learning;

use RuntimeException;

class PrerequisiteException extends RuntimeException
{
    public function __construct(string $message, public readonly int $status)
    {
        parent::__construct($message);
    }
}