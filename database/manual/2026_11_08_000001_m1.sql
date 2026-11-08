-- M1 manual migration for environments without a shell (e.g. Render free tier).
-- Run this in the Supabase SQL Editor on the PRODUCTION project after code deploy.
-- The application code already works before this SQL (fallback); this SQL activates
-- the durable sequence + idempotency constraints.
--
-- Idempotent: safe to run twice. It also records the Laravel migration so a future
-- `php artisan migrate` will not try to re-apply it.
--
-- Expected before running: take a Supabase backup/snapshot if available.
-- Project: the deployed KnowledgeHub Supabase project (NOT a local database).

BEGIN;

-- 1) Additive columns -------------------------------------------------------
ALTER TABLE messages ADD COLUMN IF NOT EXISTS sequence bigint;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS client_message_id uuid;

-- 2) Backfill durable per-conversation order --------------------------------
WITH ranked AS (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY conversation_id ORDER BY created_at, id) AS seq
    FROM messages
)
UPDATE messages AS m
SET sequence = ranked.seq
FROM ranked
WHERE m.id = ranked.id
  AND m.sequence IS NULL;

-- 3) Backfill client ids from the old JSONB metadata (user rows only) -------
UPDATE messages
SET client_message_id = (metadata->>'client_message_id')::uuid
WHERE role = 'user'
  AND jsonb_exists(metadata, 'client_message_id')
  AND metadata->>'client_message_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND client_message_id IS NULL;

-- 4) Safety: keep only the earliest user row per (conversation, client id) --
UPDATE messages AS m
SET client_message_id = NULL
WHERE role = 'user'
  AND client_message_id IS NOT NULL
  AND EXISTS (
      SELECT 1
      FROM messages AS x
      WHERE x.conversation_id = m.conversation_id
        AND x.role = 'user'
        AND x.client_message_id = m.client_message_id
        AND x.id < m.id
  );

-- 5) Unique indexes (same names as the Laravel migration) --------------------
CREATE UNIQUE INDEX IF NOT EXISTS messages_conversation_sequence_unique
    ON messages (conversation_id, sequence);

CREATE UNIQUE INDEX IF NOT EXISTS messages_conversation_client_id_unique
    ON messages (conversation_id, client_message_id);

-- 6) Record the Laravel migration ------------------------------------------
INSERT INTO migrations (migration, batch)
SELECT '2026_11_08_000001_add_message_sequence_and_idempotency',
       COALESCE((SELECT MAX(batch) FROM migrations), 0) + 1
WHERE NOT EXISTS (
    SELECT 1 FROM migrations
    WHERE migration = '2026_11_08_000001_add_message_sequence_and_idempotency'
);

COMMIT;

-- Verification (run after COMMIT):
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'messages' AND column_name IN ('sequence','client_message_id');
-- SELECT indexname, indexdef FROM pg_indexes
-- WHERE tablename = 'messages' AND indexname LIKE 'messages_conversation_%';
-- SELECT migration, batch FROM migrations
-- WHERE migration = '2026_11_08_000001_add_message_sequence_and_idempotency';
