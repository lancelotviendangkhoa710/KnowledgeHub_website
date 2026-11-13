<?php

namespace App\Exceptions\Auth;

use RuntimeException;

/** AUTH-07: too many new accounts were created from this IP address today (anti-spam). */
class GoogleSignupLimitReached extends RuntimeException {}
