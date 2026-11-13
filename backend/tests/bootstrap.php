<?php

// A cached configuration can override the test environment before TestCase
// inspects it. Refuse to bootstrap Laravel at all when a cache may be present.
if (is_file(__DIR__.'/../bootstrap/cache/config.php') || (getenv('APP_CONFIG_CACHE') ?: '') !== '') {
    throw new RuntimeException('Clear Laravel config cache before running tests.');
}

// Override inherited deployment credentials before Laravel or PHPUnit boots.
// The test database is disposable and exists only inside the Compose network.
foreach ([
    'APP_ENV' => 'testing',
    'APP_CONFIG_CACHE' => 'bootstrap/cache/config.php',
    'DB_CONNECTION' => 'pgsql',
    'DB_HOST' => 'test-db',
    'DB_PORT' => '5432',
    'DB_DATABASE' => 'knowledgehub_test',
    'DB_USERNAME' => 'knowledgehub_test',
    'DB_PASSWORD' => 'local-test',
    'DB_URL' => '',
    'DB_SSLMODE' => 'disable',
    'DB_PERSISTENT' => 'false',
    // Never write test cache/session files into the app's storage (root-owned files break the web server).
    'CACHE_STORE' => 'array',
    'SESSION_DRIVER' => 'array',
] as $key => $value) {
    putenv("{$key}={$value}");
    $_ENV[$key] = $_SERVER[$key] = $value;
}

require __DIR__.'/../vendor/autoload.php';
