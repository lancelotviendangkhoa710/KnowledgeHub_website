# Payment Context Pack

Read: `AGENTS.md`, `backend/AGENTS.md`, Payment sections of `docs/DATABASE.md` and `docs/ERD.md`, `docs/API.md`, approved ADRs, ownership registry, task spec, related source/tests.

```text
Implement only the approved Payment task after an owner is assigned.

Before editing, report: requirement; owner; allowed files; forbidden files; API/DB/security impact; all actor outcomes; tests; blockers.

Preserve: money uses NUMERIC(12,2), currency uses ISO-4217 uppercase code, and payment records are retained. Never store card details, gateway credentials, webhook secrets, or plaintext sensitive data. Webhooks require signature verification, provider/event idempotency, transaction safety, and retry-safe handling. Premium authorization requires active subscription as approved.

STOP for payment provider selection, webhook signing contract, entitlement definition, tax/invoicing policy, global auth/middleware, unapproved schema/API change, or absent Payment owner.

Before completion: run task tests, ./scripts/test-guardrails.ps1, git diff --check, git diff --stat, git diff. Report exact commands/results.
```