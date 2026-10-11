# Content Context Pack

Read: `AGENTS.md`, `backend/AGENTS.md`, `docs/API.md`, Content sections of `docs/DATABASE.md` and `docs/ERD.md`, approved ADRs, `docs/team/OWNERSHIP.md`, task spec, related content code/tests.

```text
Implement only the supplied Content task.

Before editing, report: requirement; allowed files; forbidden files; API/DB impact; Guest/User/Contributor/Admin outcomes; tests; blockers.

Preserve: curated platform, no UGC/review workflow. Content lifecycle is draft, published, archived only. Contributors edit/publish only own content; Admin manages all. Guests only view published, non-deleted content. Publishing must validate that published_version_id belongs to the article. Do not reference article_reviews. Use Policy/Gate, Form Requests, services, transactions for multi-step writes.

STOP for Course→Section→Material redesign, S3/storage integration, full-text search design, global middleware/provider/bootstrap change, unapproved API/schema change, or another domain change.

Before completion: run task tests, ./scripts/test-guardrails.ps1, git diff --check, git diff --stat, git diff. Report exact commands/results.
```