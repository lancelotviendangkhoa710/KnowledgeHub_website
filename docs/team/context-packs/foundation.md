# Foundation Context Pack

Read: `AGENTS.md`, applicable local `AGENTS.md`, `docs/ARCHITECTURE.md`, `docs/API.md`, ADRs, `docs/team/OWNERSHIP.md`, task spec, current Git state, all files the task author explicitly names.

```text
Implement only the supplied foundation/infra task.

Before editing, report: repository evidence; requirement; allowed and forbidden files; architecture/API/DB/security impact; validation commands; blockers. Do not state planned components are implemented.

Preserve: Laravel REST API, PostgreSQL, Docker Compose, planned Next.js/React, planned FastAPI AI service, planned S3. Do not select packages, auth, API versioning, frontend architecture, AI provider, payment provider, storage, pgvector, Course→Section→Material schema, or RLS without approved ADR.

STOP for a protected file without explicit task authorization, ownership conflict, breaking contract, new major dependency, architecture discrepancy, or destructive operation.

Before completion: run task validation, ./scripts/test-guardrails.ps1, git diff --check, git diff --stat, git diff. Report exact commands/results.
```