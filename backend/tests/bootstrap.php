<?php

// Override inherited deployment credentials before Laravel or PHPUnit boots.
// The test database is disposable and exists only inside the Compose network.
foreach ([
    'APP_ENV' => 'testing',
    'DB_CONNECTION' => 'pgsql',
    'DB_HOST' => 'test-db',
    'DB_PORT' => '5432',
    'DB_DATABASE' => 'knowledgehub_test',
    'DB_USERNAME' => 'knowledgehub_test',
    'DB_PASSWORD' => 'local-test',
    'DB_URL' => '',
    'DB_SSLMODE' => 'disable',
    'DB_PERSISTENT' => 'false',
] as $key => $value) {
    putenv("{$key}={$value}");
    $_ENV[$key] = $_SERVER[$key] = $value;
}

require __DIR__.'/../vendor/autoload.php';
