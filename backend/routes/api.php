<?php

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes Registry (Shared Hotspot)
|--------------------------------------------------------------------------
|
| Each domain maintains its own route file to prevent merge conflicts:
| - Identity / Auth: routes/api/auth.php (p1)
| - Content: routes/api/content.php (p2)
| - Learning: routes/api/learning.php (p3)
|
*/

if (file_exists(__DIR__ . '/api/auth.php')) {
    require __DIR__ . '/api/auth.php';
}

if (file_exists(__DIR__ . '/api/content.php')) {
    require __DIR__ . '/api/content.php';
}

if (file_exists(__DIR__ . '/api/learning.php')) {
    require __DIR__ . '/api/learning.php';
}
