-- KnowledgeHub – Constraint Validation Test Script
-- Run against a freshly migrated database to verify constraints.
-- PostgreSQL 16+

-- ============================================================
-- 1. CHECK constraint: users.status must reject invalid values
-- ============================================================
INSERT INTO users (id, name, email, password, status, created_at, updated_at)
VALUES (gen_random_uuid(), 'Test', 'a@b.com', 'hash', 'invalid', now(), now());
-- Expected: ERROR: new row for relation "users" violates check constraint "users_status_check"

-- ============================================================
-- 2. Unique partial index: duplicate active email rejected
-- ============================================================
INSERT INTO users (id, name, email, password, status, created_at, updated_at)
VALUES (gen_random_uuid(), 'Alice', 'alice@example.com', 'hash', 'active', now(), now());
INSERT INTO users (id, name, email, password, status, created_at, updated_at)
VALUES (gen_random_uuid(), 'Alice2', 'alice@example.com', 'hash', 'active', now(), now());
-- Expected: ERROR: duplicate key value violates unique constraint "users_email_unique"

-- ============================================================
-- 3. FK: user_roles must reject non-existent user
-- ============================================================
INSERT INTO user_roles (user_id, role_id, created_at)
VALUES (gen_random_uuid(), gen_random_uuid(), now());
-- Expected: ERROR: insert or update on table "user_roles" violates foreign key constraint

-- ============================================================
-- 4. Duplicate bookmark rejected
-- ============================================================
-- (Assumes user_id=:uid and article_id=:aid already exist)
-- INSERT INTO bookmarks (user_id, article_id, created_at) VALUES (:uid, :aid, now());
-- INSERT INTO bookmarks (user_id, article_id, created_at) VALUES (:uid, :aid, now());
-- Expected: ERROR: duplicate key value violates unique constraint "bookmarks_pkey"

-- ============================================================
-- 5. article_versions: duplicate version_no per article rejected
-- ============================================================
-- (Assumes article_id=:aid and created_by=:uid exist)
-- INSERT INTO article_versions (id, article_id, version_no, title, content, created_by, created_at)
--   VALUES (gen_random_uuid(), :aid, 1, 'T', 'C', :uid, now());
-- INSERT INTO article_versions (id, article_id, version_no, title, content, created_by, created_at)
--   VALUES (gen_random_uuid(), :aid, 1, 'T2', 'C2', :uid, now());
-- Expected: ERROR: duplicate key value violates unique constraint "article_versions_article_id_version_no_unique"

-- ============================================================
-- 6. Webhook event duplicate rejected
-- ============================================================
INSERT INTO webhook_events (id, provider, provider_event_id, status, created_at)
VALUES (gen_random_uuid(), 'stripe', 'evt_001', 'pending', now());
INSERT INTO webhook_events (id, provider, provider_event_id, status, created_at)
VALUES (gen_random_uuid(), 'stripe', 'evt_001', 'pending', now());
-- Expected: ERROR: duplicate key value violates unique constraint "webhook_events_provider_provider_event_id_unique"

-- ============================================================
-- 7. Self-prerequisite rejected
-- ============================================================
-- INSERT INTO roadmap_item_prerequisites (roadmap_item_id, prerequisite_item_id)
--   VALUES (:item_id, :item_id);
-- Expected: ERROR: new row for relation "roadmap_item_prerequisites" violates check constraint
--           "roadmap_item_prerequisites_no_self_ref"

-- ============================================================
-- 8. plans.price must be >= 0
-- ============================================================
INSERT INTO plans (id, name, price, currency, billing_interval, status, created_at, updated_at)
VALUES (gen_random_uuid(), 'Bad', -1.00, 'USD', 'monthly', 'active', now(), now());
-- Expected: ERROR: new row for relation "plans" violates check constraint "plans_price_check"

-- ============================================================
-- 9. plans.currency must be 3 uppercase letters
-- ============================================================
INSERT INTO plans (id, name, price, currency, billing_interval, status, created_at, updated_at)
VALUES (gen_random_uuid(), 'Bad', 0.00, 'us', 'monthly', 'active', now(), now());
-- Expected: ERROR: new row for relation "plans" violates check constraint "plans_currency_check"

-- ============================================================
-- 10. messages.role: invalid role rejected
-- ============================================================
-- INSERT INTO messages (id, conversation_id, role, content, created_at)
--   VALUES (gen_random_uuid(), :conv_id, 'bot', 'hello', now());
-- Expected: ERROR: new row violates check constraint "messages_role_check"

-- ============================================================
-- Schema inspection queries
-- ============================================================
\dt                     -- list all tables
\d users                -- describe users table
\d articles             -- describe articles table
SELECT conname, contype, consrc
FROM pg_constraint
WHERE conrelid = 'users'::regclass;
