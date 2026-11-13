<?php

namespace App\Exceptions\Auth;

use RuntimeException;

/** AUTH-07: a new account may not be created for this email domain (anti-spam allowlist). */
class GoogleDomainNotAllowed extends RuntimeException {}
