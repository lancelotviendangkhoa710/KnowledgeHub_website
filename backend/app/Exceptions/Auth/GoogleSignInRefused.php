<?php

namespace App\Exceptions\Auth;

use RuntimeException;

/** AUTH-07: a Google sign-in is refused; `reason` is the code the login page shows (`?error=<reason>`). */
class GoogleSignInRefused extends RuntimeException
{
    public function __construct(public readonly string $reason)
    {
        parent::__construct($reason);
    }
}
