# Identity/Auth Context Pack

Read: `AGENTS.md`, `backend/AGENTS.md`, `docs/API.md`, Identity sections of `docs/DATABASE.md` and `docs/ERD.md`, approved ADRs, `docs/team/OWNERSHIP.md`, task spec, related auth code/tests.

```text
Implement only the supplied Identity/Auth task.

Before editing, report: requirement; allowed files; forbidden files; API/DB impact; all four actor outcomes; tests; blockers.

Preserve: roles are admin, contributor, user only. Registration defaults to pending then verified active user. Only Admin grants contributor/admin. Hash passwords. Never reveal credential-validity details beyond approved API behavior. Use Policy/Gate and services; no business logic in controllers.

STOP for auth mechanism/package, global middleware/provider/bootstrap change, API contract ambiguity, role/schema redesign, or another domain change. Return STATUS: BLOCKED. Do not implement a workaround.

Before completion: run task tests, ./scripts/test-guardrails.ps1, git diff --check, git diff --stat, git diff. Report exact commands/results.
```