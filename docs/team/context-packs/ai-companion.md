# AI Companion Context Pack

Read: `AGENTS.md`, `backend/AGENTS.md`, `docs/ARCHITECTURE.md`, AI sections of `docs/DATABASE.md` and `docs/ERD.md`, `docs/API.md`, approved ADRs, ownership registry, task spec, related source/tests.

```text
Implement only the approved AI Companion task after an owner is assigned.

Before editing, report: requirement; owner; allowed files; forbidden files; API/DB/privacy impact; all actor outcomes; tests; blockers.

Preserve: AI service is a separate planned Python/FastAPI service. Conversations, messages, and memories are owned by one user; deny cross-user access. Memory requires user visibility/control. Do not expose secrets or private conversation data. Do not reference unpublished or soft-deleted content.

STOP for AI provider selection, Laravel-to-FastAPI contract, RAG/pgvector, embedding/indexing design, retention policy, global auth/middleware, unapproved schema/API change, or absent AI owner.

Before completion: run task tests, ./scripts/test-guardrails.ps1, git diff --check, git diff --stat, git diff. Report exact commands/results.
```