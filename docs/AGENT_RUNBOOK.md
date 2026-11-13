# Runtime and database safety

The application uses the shared Supabase PostgreSQL database. Treat all data
there as valuable. Never run tests, `migrate:fresh`, `migrate:refresh`,
`db:wipe`, or seeders against it. Do not run schema changes without explicit
team approval and a reviewed recovery plan. The local test container is the
only database for automated tests; its contents are disposable.

For tests, first start the isolated database and application:

```powershell
docker compose --profile test up -d app test-db
docker compose exec -T app php vendor/bin/phpunit --testsuite=Unit
```

Run PHPUnit directly so its safety bootstrap runs before Laravel starts. Clear
any Laravel config cache first; PHPUnit refuses to run when it detects one.
`backend/tests/bootstrap.php` overrides inherited DB settings; the Laravel
test base class checks the resulting connection before tests run. Never bypass
either guard or reuse `test-db` for shared data. The test database uses tmpfs
and is lost when its container stops. This guard protects the PHPUnit workflow;
it cannot prevent arbitrary SQL or artisan commands. Use separate least-privilege
database accounts, backups and recovery procedures for additional protection.

For the application, configure `backend/.env` privately and run
`docker compose up -d`. Inspect service status with `docker compose ps` and
logs with `docker compose logs --tail=100 app nginx frontend ai-service`.
Frontend: `http://localhost:3000`; API: `http://localhost:8080/api/v1/categories`.
The AI health endpoint can be checked without a provider request:
`docker compose exec -T ai-service python -c "import urllib.request; print(urllib.request.urlopen('http://localhost:8000/health').status)"`.
Never print credentials or tokens from environment files or logs.

If API requests fail with PostgreSQL prepared statement protocol errors while
using Supabase transaction pooling, obtain the correct session-pooler endpoint
from Supabase and disable persistent connections. Restart app and nginx after
changing backend connection settings. No database reset is required.
