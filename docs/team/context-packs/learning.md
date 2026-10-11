# Learning Context Pack

Read: `AGENTS.md`, `backend/AGENTS.md`, `docs/API.md`, Learning sections of `docs/DATABASE.md` and `docs/ERD.md`, approved ADRs, `docs/team/OWNERSHIP.md`, task spec, related learning code/tests.

```text
Implement only the supplied Learning task.

Before editing, report: requirement; allowed files; forbidden files; API/DB impact; Guest/User/Contributor/Admin outcomes; tests; blockers.

Preserve: roadmaps are user-owned. Only owner or Admin may read/mutate them. Roadmap item positions are unique per roadmap. Prerequisites cannot self-reference or form cycles; validate the full graph in the service layer. Progress is currently roadmap-item scoped, not global course progress. Use Policy/Gate, Form Requests, services, transactions for multi-step writes.

STOP for enrollment/course progress, Course→Section→Material redesign, roadmap target refactor, AI generation, global middleware/provider/bootstrap change, unapproved API/schema change, or another domain change.

Before completion: run task tests, ./scripts/test-guardrails.ps1, git diff --check, git diff --stat, git diff. Report exact commands/results.
```