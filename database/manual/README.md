# Manual M1 migration (Render free tier / no shell)

Use this when the backend host does not provide a shell (e.g. Render free tier) and you cannot run
`php artisan migrate --force`. The application code has a pre-migration fallback, so chat keeps
working while this is pending; running this SQL activates the durable ordering/idempotency indexes.

## A. Run M1 in Supabase SQL Editor

1. Open the **production** Supabase project → **SQL Editor**.
2. If available, take a backup/snapshot first.
3. Open [`2026_11_08_000001_m1.sql`](./2026_11_08_000001_m1.sql) and paste its full contents.
4. Run it. It is idempotent (safe to run twice).
5. Verify with the queries at the bottom of the SQL file:
   - `messages.sequence` and `messages.client_message_id` exist;
   - `messages_conversation_sequence_unique` and `messages_conversation_client_id_unique` exist;
   - the `migrations` row for `2026_11_08_000001_add_message_sequence_and_idempotency` exists.
6. No redeploy is required: the next request sees the columns and uses M1.

> **Do not** run this on a local/demo DB by mistake; use the project that the Render backend uses.

## B. Laravel migration status (if you later get shell access)

```bash
php artisan migrate:status
# 2026_11_08_000001_add_message_sequence_and_idempotency ... Ran
```

If the migration row is missing but the columns/indexes exist, `php artisan migrate --force` would
try to re-apply; the SQL inserts the migration row to prevent that.

## C. 30-day retention on a free host

The Artisan command `ai:purge-deleted-users` and its daily schedule are in the repo, but a free
host may not run a scheduler/cron. Options:

1. **Supabase `pg_cron`** (if enabled on the project): schedule a SQL purge, e.g.
   ```sql
   -- run in SQL editor once; requires pg_cron
   SELECT cron.schedule('ai-purge-30d', '0 3 * * *', $$
     DELETE FROM user_memories
     WHERE user_id IN (SELECT id FROM users WHERE deleted_at <= now() - interval '30 days');
     DELETE FROM conversations
     WHERE user_id IN (SELECT id FROM users WHERE deleted_at <= now() - interval '30 days');
   $$);
   ```
   (Messages cascade from conversations; this bypasses Laravel logging. Confirm with Privacy.)
2. **External free cron** (GitHub Actions / cron-job.org) calling the protected internal endpoint
   (implemented):
   - Set a long random `RETENTION_CRON_TOKEN` on the Render backend service, then redeploy
     (`php artisan config:cache` runs at boot).
   - URL: `POST https://knowledgehub-website.onrender.com/api/internal/ai/purge-deleted-users`
   - Header: `X-Retention-Token: <RETENTION_CRON_TOKEN>`
   - Responses: `200` success (exit_code + command output), `401` missing/wrong token,
     `429` rate limit (6/min/IP), `503` token not configured.
   - Never commit the token or put it in a URL/query string.

   GitHub Actions workflow đã có trong repo: `.github/workflows/ai-retention.yml`
   (chạy 20:00 UTC = 03:00 Asia/Ho_Chi_Minh; default branch hiện là `dev`).
   Secret cần đặt tên `RETENTION_CRON_TOKEN`; test tay bằng **Actions → ai-retention → Run workflow**.
   ```yaml
   on:
     schedule: [{ cron: '0 20 * * *' }]   # 03:00 VN
     workflow_dispatch:
   # step: POST .../api/internal/ai/purge-deleted-users
   #       header X-Retention-Token: ${{ secrets.RETENTION_CRON_TOKEN }}
   ```
3. **Render Cron Job** (if the plan supports it) running `php artisan ai:purge-deleted-users`.

## D. Rollback

Manual SQL rollback (only if you must revert M1):

```sql
BEGIN;
DROP INDEX IF EXISTS messages_conversation_client_id_unique;
DROP INDEX IF EXISTS messages_conversation_sequence_unique;
ALTER TABLE messages DROP COLUMN IF EXISTS client_message_id;
ALTER TABLE messages DROP COLUMN IF EXISTS sequence;
DELETE FROM migrations WHERE migration = '2026_11_08_000001_add_message_sequence_and_idempotency';
COMMIT;
```

Rollback loses the durable idempotency constraint; the application falls back to the pre-M1 path.
