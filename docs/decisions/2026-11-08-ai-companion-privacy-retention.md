# Decision: AI Companion privacy, retention, and provider (ADR-C)

**Status**: Approved for V1 feature enablement (operator, 2026-11-08); **DPA / legal review still open**  
**Date**: 2026-11-08  
**Author**: AI agent (review/implementation), recorded at the repository owner's direction  
**Related**: `reviews/KNOWLEDGEHUB-LEARNING-AI05-REVIEW.md` §7, `reviews/proposals/ADR-C-ai-privacy-threat-model-PROPOSED.md`, `docs/NFR.md` NFR-PRIV-01/02, `docs/API.md` §7, commits `fa840eb`/`b947772`

> This ADR records the decision to enable the AI Companion V1. It does **not** replace a signed
> Data Processing Agreement (DPA) or a Legal/Privacy sign-off. The DPA/retention items below are
> recorded as **open** until the named owners approve them. If Legal rejects the provider terms,
> chat must be disabled again with `AI_CHAT_ENABLED=false`.

## Context

The AI Companion (AI-01 conversations, AI-02 message history/send, AI-03 explicit memory) stores
personal conversation content and sends the current conversation plus explicitly-added memories to
DeepSeek (`https://api.deepseek.com/chat/completions`) via the private FastAPI service
`knowledgehub-ai-service`. `NFR-PRIV-01` requires access, retention, and deletion rules to be
approved before long-term AI data is enabled. The operator approved enabling chat on 2026-11-08 and
asked for the decision to be recorded formally.

## Decision

1. **Enable V1 chat** for authenticated `user`, `contributor`, and `admin` actors, owner-only.
   `services.ai.chat_enabled` defaults to `true`; it can be disabled with `AI_CHAT_ENABLED=false`.
2. **No admin/ops read access** to another user's conversations or memories in V1. There is no
   break-glass path yet. If added later it requires a separate audited ability + privacy approval.
3. **Data collected (minimum):** conversation title, message role/content, message `metadata`
   (provider/model/request id only), explicit memory `memory_type/content/expires_at`. No
   passwords, payment data, API keys, IP addresses, user-agent, or full prompt/system instructions
   are stored. `provider`/`model` metadata is whitelisted.
4. **Retention (V1, approved 2026-11-08):** conversations/messages are kept until the user deletes
   the conversation. When an account is soft-deleted, its AI Companion rows (conversations/messages,
   explicit memories) are **purged after 30 days** by the `ai:purge-deleted-users` command
   (scheduled daily at 03:00). The Auth-owned user row itself is not hard-deleted by this command;
   a full-account purge remains an Identity/Auth + Privacy follow-up. No automatic TTL for active
   conversations in V1.
5. **User deletion / DSR (V1):** deleting a conversation cascades its messages; deleting a memory
   is a tombstone (`status='deleted'`) and is excluded from lists/prompt injection. Self-service
   JSON export, delete-all-history, and account-deletion purge are **not implemented yet** and are
   tracked as follow-ups.
6. **Consent/notice:** chat is enabled on the basis of the operator's approval; a user-facing
   privacy notice describing AI processing, the AI provider, and the fact that conversations and
   memories are sent to DeepSeek must be published before public launch.
7. **Subprocessor / cross-border (open):** DeepSeek is a subprocessor outside the project's
   jurisdiction. Terms/DPA, data-use-for-training, and provider retention **must be reviewed and
   recorded by Legal/Privacy**. Until then this ADR treats provider retention/training as
   unknown and the item as open. No engineer/AI may assert DPA approval.
8. **Logging/security:** application/AI service logs never include message content, prompts,
   authorization headers, service tokens, or provider bodies. Diagnostics are limited to
   `request_id`, provider, category, status, latency, and token counts.
9. **Memory:** explicit-only. The AI never extracts memories automatically; `instruction` type is
   rejected at the API to prevent stored prompt injection. `activeForPrompt()` is owner-scoped,
   active-only, non-expired, capped.
10. **Auth:** Sanctum bearer tokens; token is kept in memory on the frontend (no localStorage) so a
    full page reload logs the user out. A move to HttpOnly cookies is a future API-contract decision.

## Approval / ownership record

| Item | Owner | Status |
|---|---|---|
| Enable AI Companion V1 chat (operator) | Repository owner | **Approved 2026-11-08** |
| Own the AI Companion domain in `docs/team/OWNERSHIP.md` | Team/Lead | **TBD — must be assigned** |
| Retention policy sign-off (TTL, deletion, backups) | Product + Privacy | **Approved 2026-11-08**: delete-conversation + purge AI rows 30 days after account deletion; no active TTL; backup/provider limits still to document |
| DeepSeek DPA / subprocessor / cross-border / training-use | Privacy/Legal | **Open — legal review required** |
| User-facing AI privacy notice | Product + Privacy | **Open — before public launch** |
| Security threat-model review (prompt injection, memory poisoning, admin access) | Security | **Open — ADR-C draft threat model is input** |
| DSR export/delete-all UI | Product + Privacy | **Open — follow-up** |
| Account deletion purge of AI rows | Privacy + Auth owner + AI owner | **Open — follow-up; cross-domain** |

## Consequences

### Positive
- Chat is usable now with conservative defaults: owner-only, explicit memory, no admin read.
- Content/keys are handled only by Laravel and the FastAPI service; the browser never sees provider keys.
- Clear list of legal/privacy items prevents "silent approval" of a foreign subprocessor.

### Negative / limitations
- Provider retention/training remains legally unconfirmed until Legal records it.
- Deleted accounts can leave conversation/memory rows until the purge job exists.
- No export/delete-all UI yet; memory delete leaves a tombstone.
- Conversation content is sent to a third-party provider on every send; cost and latency apply.

### Risks and mitigations
- **Provider data-use unknown** → do not claim no-training; Legal review before public launch; can disable chat immediately.
- **Prompt injection / memory poisoning** → content and memory are labelled untrusted data; no tools; `instruction` forbidden; Security review open.
- **Data retention in backups** → document backup/provider limits honestly; add TTL/purge job.
- **Admin insider access** → no admin read path in V1; future break-glass requires audit + notice.

## Alternatives Considered

1. **Keep chat disabled until DPA signed** — safer legally, rejected by operator to allow controlled V1 use.
2. **Store chat in browser/local only** — rejected: no durable history and no server-side policy.
3. **Admin can read conversations like roadmaps** — rejected for V1 privacy reasons.
4. **Inferred memory in V1** — rejected; explicit-only until consent/threat model is approved.

## Implementation Notes

- Feature flag: `backend/config/services.php` (`AI_CHAT_ENABLED`, default true after approval).
- Routes: `backend/routes/api/ai.php`; controllers/services under `backend/app/Http/Controllers/AI` and `backend/app/Services/AI`.
- AI service: `ai-service/app/main.py` `POST /v1/chat` (service token, stateless, no DB).
- Frontend: `/ai/companion`, `frontend/src/lib/aiCompanionClient.ts`.
- Contract: `docs/API.md` §7.
- Deployed: `origin/dev` commits `29a7a53` → `fa840eb` → `b947772`; production E2E verified 2026-11-08 (chat 201 + assistant reply + history 2 messages).
- Retention implementation: `backend/app/Console/Commands/PurgeDeletedAiCompanionData.php`,
  scheduled in `backend/routes/console.php` (`ai:purge-deleted-users`, daily 03:00). Requires a
  scheduler process on the host (Render Cron Job running `php artisan schedule:run`, or a daily
  `php artisan ai:purge-deleted-users` job).
- Free-tier fallback: `POST /api/internal/ai/purge-deleted-users` protected by the
  `X-Retention-Token` header (`RETENTION_CRON_TOKEN` env, constant-time compare, 6/min/IP).
  Call it from GitHub Actions/cron-job.org; returns 503 when the token is not configured.
  Runbook: `database/manual/README.md`.
- M1 ordering/idempotency migration: `database/migrations/2026_11_08_000001_add_message_sequence_and_idempotency.php`.

## Validation

```powershell
docker compose exec -T app php artisan test          # expected: 175 passed (821 assertions)
docker compose exec -T app php artisan test --filter='AI'
cd ai-service; py -m unittest discover -s tests -p 'test_*.py'   # expected: 19 tests OK
cd frontend; npx --no-install tsc --noEmit; npm run build
```

Manual production checks (owner-only):
- user A cannot read/update/delete user B conversation or memory (404);
- `GET /api/v1/bookmarks` returns 200 with a valid Sanctum token;
- chat send returns 201 with an assistant reply when `AI_CHAT_ENABLED=true`, 503 `chat_disabled` when false;
- logs contain no message content/Authorization/service token.
