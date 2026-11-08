# Decision: AI Companion message ordering & durable idempotency (M1)

**Status**: Proposed — awaiting Architecture/DB-owner approval  
**Date**: 2026-11-08  
**Author**: AI agent (implementation review), requested by repository owner  
**Related**: ADR-C `docs/decisions/2026-11-08-ai-companion-privacy-retention.md`, `reviews/proposals/ADR-B-ai-companion-schema-M1-PROPOSED.md`, `backend/app/Services/AI/MessageService.php`, migration `database/migrations/2026_01_01_000007_create_ai_companion_tables.php`

> **TL;DR for the owner:** V1 works today without changing the schema. "M1" is one small additive
> migration that makes message ordering and retry-deduplication *guaranteed* instead of
> "best-effort". Recommendation: **approve M1 before public launch**; it is optional for a small pilot.

## Context

V1 stores AI chat in the existing `messages` table from migration `000007`:

- `created_at` is `timestampTz` with **second precision** (Laravel default `timestampTz` precision 0).
  Microsecond offsets are truncated, so user/assistant messages can share a timestamp.
- Current workaround: `MessageService` forces timestamps to whole seconds and keeps each new pair
  after the previous message. This passes tests and is deterministic for normal traffic, but:
  - timestamps can drift into the future under very fast consecutive sends;
  - ordering still relies on `(created_at, id)` with random UUID tie-breaks.
- Idempotency uses `messages.metadata->>'client_message_id'` + a check-then-insert. Two concurrent
  retries can both pass the check and create duplicate pairs. There is no unique constraint.
- `messages` has no explicit sequence column; the API contract exposes `meta.has_more` and
  `before_id` pagination based on `(created_at, id)`.

The owner asked whether M1 is needed. This ADR records the options and the recommended default.

## Options

### Option A — keep V1 schema (status quo)

- No new migration; no `docs/DATABASE.md`/`ERD.md` change.
- Ordering/idempotency as currently implemented (second-granularity + best-effort).
- Acceptable for a pilot/small traffic; duplicates are possible under a rare concurrent retry.
- **Reject if** chat becomes a core feature with retries/timeouts or multi-instance traffic.

### Option B — approve M1 (recommended)

One additive migration, **no new tables** (keeps the 25-table invariant):

1. Add `messages.sequence` (`unsignedBigInteger`, nullable initially), backfill per conversation with
   `ROW_NUMBER() OVER (PARTITION BY conversation_id ORDER BY created_at, id)`, then add a
   `(conversation_id, sequence)` index (optionally unique).
2. Add `messages.client_message_id` (`uuid`, nullable) + partial unique index
   `(conversation_id, client_message_id) WHERE client_message_id IS NOT NULL` (PostgreSQL).
3. Code: set `sequence` on insert; order history/context by `sequence`; use the column for replay
   lookups; keep writing metadata.client_message_id for backward compatibility.
4. Cursor: `before_id` can stay, but the service resolves the anchor and filters by `sequence`
   instead of `(created_at, id)`; response fields `has_more/next_before_id` unchanged.
5. Docs/tests: update `docs/API.md` (history ordering/idempotency notes), `docs/DATABASE.md`,
   `docs/ERD.md`, `docs/validation_tests.sql`; add concurrent-retry and ordering tests.

**Cost:** ~0.5–1 engineering day including tests/docs; migration is additive and reversible (drop
columns in `down()`); existing rows are small. **Risk:** low; the only operational step is the
backfill migration during a normal deployment window.

## Recommendation

- **Pilot now:** Option A is acceptable; chat is live and tested (175 backend tests, 19 AI-service
  tests, production E2E 201).
- **Before public launch / paid traffic:** approve **Option B (M1)**. It removes the rare duplicate
  class and makes ordering independent of clock precision/UUID randomness.

## Decision needed

| Role | Action |
|---|---|
| Repository owner | Reply approve/reject M1 (one line). |
| Architecture + DB owner | Review migration plan + docs updates. |
| AI Companion owner | Assign owner (currently TBD) so the change has an accountable reviewer. |

## Validation (after approval/implementation)

```powershell
docker compose exec -T app php artisan test --filter='AI'
# expected: all pass, including new sequence-ordering and concurrent idempotency tests
docker compose exec -T app php artisan migrate --pretend   # review generated SQL before applying
docker compose exec -T app php artisan migrate
git diff --check
```

Manual checks:
- two inserts in one transaction have strictly increasing `sequence` and stable history order;
- concurrent POST with the same `client_message_id` yields exactly one user/assistant pair (409/201 replay);
- `before_id` pagination still returns `has_more/next_before_id` correctly;
- `docs/validation_tests.sql` assertions pass.
