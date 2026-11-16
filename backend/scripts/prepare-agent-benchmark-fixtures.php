<?php

declare(strict_types=1);

// One-time controlled fixture creation on the disposable Compose test-db.
// No reset, seed command, shared database, or credential output.
foreach ([
    'DB_CONNECTION' => 'pgsql',
    'DB_HOST' => 'test-db',
    'DB_DATABASE' => 'knowledgehub_test',
    'DB_URL' => '',
    'CV_STORAGE_DRIVER' => 'local',
] as $key => $expected) {
    if ((getenv($key) ?: '') !== $expected) {
        fwrite(STDERR, "Isolated benchmark environment verification failed.\n");
        exit(1);
    }
}
if (is_file(__DIR__.'/../bootstrap/cache/config.php')) {
    fwrite(STDERR, "Laravel config cache must be absent.\n");
    exit(1);
}

require __DIR__.'/../tests/bootstrap.php';
$app = require __DIR__.'/../bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$database = config('database.connections.pgsql');
if (config('database.default') !== 'pgsql'
    || ($database['host'] ?? null) !== 'test-db'
    || ($database['database'] ?? null) !== 'knowledgehub_test'
    || ! empty($database['url'])
    || config('filesystems.disks.cv.driver') !== 'local') {
    fwrite(STDERR, "Laravel configuration is not isolated.\n");
    exit(1);
}
$actual = \Illuminate\Support\Facades\DB::selectOne('SELECT current_database() AS name');
if (($actual->name ?? null) !== 'knowledgehub_test') {
    fwrite(STDERR, "Connected database is not the disposable test database.\n");
    exit(1);
}
foreach (['roles', 'users', 'user_roles', 'personal_access_tokens', 'user_cvs',
    'ai_agent_approvals', 'ai_cv_confirmations'] as $table) {
    if (! \Illuminate\Support\Facades\Schema::hasTable($table)) {
        fwrite(STDERR, "Forward migration must be completed on test-db first.\n");
        exit(1);
    }
}

$directory = storage_path('app/private');
if (! is_dir($directory) && ! mkdir($directory, 0700, true) && ! is_dir($directory)) {
    fwrite(STDERR, "Private fixture directory is unavailable.\n");
    exit(1);
}
$path = $directory.'/agent-benchmark-credentials-'.bin2hex(random_bytes(8)).'.json';
$stream = fopen($path, 'x');
if ($stream === false) {
    fwrite(STDERR, "Could not create private credentials file.\n");
    exit(1);
}
if (! chmod($path, 0600)) {
    fclose($stream);
    unlink($path);
    fwrite(STDERR, "Private credentials file permissions are not restrictive.\n");
    exit(1);
}
clearstatcache(true, $path);
if ((fileperms($path) & 0077) !== 0) {
    fclose($stream);
    unlink($path);
    fwrite(STDERR, "Private credentials file permissions are not restrictive.\n");
    exit(1);
}

try {
\Illuminate\Support\Facades\DB::transaction(function () use ($stream): void {
    $roles = [];
    foreach (['admin', 'contributor', 'user'] as $name) {
        $roles[$name] = \App\Models\Role::firstOrCreate(
            ['name' => $name], ['description' => ucfirst($name).' benchmark role']
        );
    }
    $stamp = bin2hex(random_bytes(6));
    $accounts = [];
    foreach (['admin', 'contributor', 'user', 'target'] as $kind) {
        $role = $kind === 'target' ? 'user' : $kind;
        $account = \App\Models\User::create([
            'name' => 'Agent Benchmark '.ucfirst($kind),
            'email' => "kh-agent-bench-{$kind}-{$stamp}@example.invalid",
            'password' => \Illuminate\Support\Facades\Hash::make(bin2hex(random_bytes(24))),
        ]);
        $account->status = 'active';
        $account->save();
        $account->roles()->attach($roles[$role]->id);
        $accounts[$kind] = $account;
    }
    $fixture = [
        'contributor_token' => $accounts['contributor']->createToken('agent-benchmark')->plainTextToken,
        'admin_token' => $accounts['admin']->createToken('agent-benchmark')->plainTextToken,
        'user_token' => $accounts['user']->createToken('agent-benchmark')->plainTextToken,
        'target_user_id' => $accounts['target']->id,
        'target_initial_status' => 'active',
    ];
    $encoded = json_encode($fixture, JSON_THROW_ON_ERROR)."\n";
    if (fwrite($stream, $encoded) !== strlen($encoded) || ! fflush($stream)) {
        throw new \RuntimeException('Could not persist private fixture credentials.');
    }
});
} catch (\Throwable) {
    fclose($stream);
    unlink($path);
    fwrite(STDERR, "Fixture creation rolled back; no credentials were retained.\n");
    exit(1);
}
fclose($stream);
echo "fixture_accounts=4 fixture_tokens=3 credentials_file={$path}\n";
