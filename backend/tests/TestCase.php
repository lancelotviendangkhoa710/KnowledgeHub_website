<?php

namespace Tests;

use Illuminate\Contracts\Console\Kernel;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    public function createApplication()
    {
        $app = require __DIR__.'/../bootstrap/app.php';

        $app->make(Kernel::class)->bootstrap();

        $connection = $app['config']->get('database.connections.pgsql');
        if ($app['config']->get('database.default') !== 'pgsql'
            || ($connection['host'] ?? null) !== 'test-db'
            || ($connection['database'] ?? null) !== 'knowledgehub_test'
            || ! empty($connection['url'])) {
            throw new \RuntimeException('Tests require the isolated test-db/knowledgehub_test database.');
        }

        return $app;
    }
}
