# AGENTS.md — KnowledgeHub AI Agent Constitution

**Version**: 3.0 | **Date**: 2026-11-21
**Scope**: Global — applies to all AI coding agents in this repository.
Child files (`backend/AGENTS.md`) specialize these rules; on conflict, **this file wins**.

*Priority: Correctness > Speed. Diagnose before editing. Minimal diff. Never guess past 2 failed fixes.*

---

## 1. Project Identity & Stack

KnowledgeHub is a **curated learning platform** with an AI Learning Companion, operated by an internal content team.
**NOT** a social platform. **NOT** a UGC platform. **NO** community moderation.

| Layer | Technology | Status |
| --- | --- | --- |
| Backend API | Laravel 11 REST API | Active |
| Database | PostgreSQL 16 / Supabase PostgreSQL | Active |
| Frontend | Next.js / React (`frontend/`) | Active / Scaffolded |
| AI Service | Python + FastAPI (`ai-service/`) | Active (separate service) |
| Dev Environment | Docker Compose | Active |
| File Storage | Amazon S3 | Planned |

Do NOT introduce technologies outside this list without an approved ADR.

**Source of Truth (highest to lowest):**
`Approved ADRs (docs/decisions/)` > `Implemented code` > `Migrations` > `docs/API.md` > `docs/DATABASE.md & ERD.md` > `AGENTS.md` > `Task spec` > `AI suggestions (never authoritative)`.

---

## 2. Locked Business Invariants

- **Roles (exact 3 DB values):** `admin` (full control), `contributor` (internal team; Admin-assigned only, no auto-upgrade), `user` (default learner). Guest = unauthenticated, no DB role.
  - **Banned role names:** `reviewer`, `learner`, `moderator`, `editor`, `author`, `teacher`, `instructor`.
- **Publishing Workflow:** `draft` (Contributor creates) → `published` (Contributor/Admin sets `published_version_id`) → `archived` (Contributor own / Admin all).
  - **Banned statuses / steps:** `submitted`, `rejected`, `pending_review`, `approved`, `moderated`; no review step.
- **Dormant table:** `article_reviews` exists in DB from an old model. No application code may reference it.

| Capability (Laravel Policy/Gate) | Guest | User | Contributor | Admin |
| --- | :---: | :---: | :---: | :---: |
| View published content | ✅ | ✅ | ✅ | ✅ |
| Register / Login | ✅ | — | — | — |
| Enroll, Progress, Bookmark, AI Companion, Roadmap, Subscribe | ❌ | ✅ | ✅ | ✅ |
| Create / edit / publish / archive **own** courses | ❌ | ❌ | ✅ | ✅ |
| Manage all courses, users, roles, plans | ❌ | ❌ | ❌ | ✅ |

---

## 3. Security & Database Safety (Non-Negotiable)

- **Secrets & Queries:** Never commit `.env`, credentials, API keys, tokens, or private keys. Never store plaintext passwords or card numbers. Always use parameter binding. Never run `UPDATE`/`DELETE` without `WHERE` in production. Never disable DB constraints.
- **Disposable Test DB Guard:** Read `docs/AGENT_RUNBOOK.md` before runtime, testing, or deployment tasks. **NEVER** run automated tests, `migrate:fresh`, `migrate:refresh`, `db:wipe`, `db:seed`, or destructive/reset commands against shared or cloud databases. PHPUnit MUST use only the disposable Compose `test-db`. Verify the active connection before running; never bypass the test bootstrap or DB guard. A unit-test label does not imply read-only.
- **Schema Conventions (when touching DB):** UUID v4 PKs everywhere · `timestampTz` everywhere · explicit FKs + cascade rules · `VARCHAR` + `CHECK` (never native PG ENUM) · `NUMERIC(12,2)` monetary · `CHAR(3)` ISO 4217 `[A-Z]{3}` currency · `JSONB` only for genuinely variable data · S3 for binaries (PG stores metadata only) · soft delete (`deleted_at`) on `users` and content tables.
- **Known Active Inconsistencies (do NOT auto-fix without team-approved migration):**
  1. `articles_status_check` in `2026_01_01_000005_create_articles_tables.php` still allows legacy `submitted`, `rejected`.
  2. Migration `000002` comment references the old 4-role model.
  3. `docs/DATABASE.md` & `docs/ERD.md` prose vs dormant `article_reviews` in migration `000006`.

---

## 4. Context & Token Discipline (Targeted Read)

- **Read Broadly (allowed), Fetch Narrowly (default):** Read ONLY files directly relevant to the task (`@file` refs, target module, and its tests).
- **On-Demand Docs:** Do NOT bulk-read `docs/decisions/`, `docs/API.md`, `docs/DATABASE.md`, `docs/ERD.md`, or `docs/team/context-packs/` unless the task modifies architecture, API contracts, DB schema, or enters an unfamiliar domain.
- **Minimal Diff:** Implement the smallest coherent change for the task. No unrelated refactoring, whole-file reformatting, or unrequested dependency upgrades.
- **Session Handoff:** Before ending a long session (or when requested), output a `<=15-line` summary: goal, exact modified paths, verified test commands/results, remaining blocker, and next concrete step.

---

## Execution Protocol: Confirm-Before-Act & Conciseness

1. **Default Mode (Plan & Clarify First):** For any task NOT prefixed with `[FAST]` or backed by an explicit execution plan, operate in Read-Only mode first:
   - Inspect only the relevant files (`Targeted Read`). Do NOT edit files or run state-changing commands yet.
   - Restate your understanding of the goal and constraints in max 3 short bullet points.
   - If any requirement or architecture choice is ambiguous, ask 2–3 multiple-choice questions (`A`, `B`, `C`), each with concise **Pros**, **Cons**, and a marked `(Recommended)` default.
   - Propose a concrete file-by-file execution plan and **STOP**, waiting for explicit user approval (`"Approved"` / `"Proceed"`) before writing code.
2. **Fast / Pre-Planned Bypass:** If the user prompt starts with `[FAST]` OR provides an explicit step-by-step Handoff Spec (Target Files, Changes, Non-Goals, Verification), skip clarification questions and execute directly according to the spec.
3. **Code Comments Discipline (No Fluff, No Rationalization):**
   - Keep code comments strictly minimal and concise (1 short line max).
   - **NEVER** write comments that narrate *what* obvious code is doing (e.g., `// increment counter`, `// fetch user data`).
   - Comment **ONLY** non-obvious *why* (business constraints, race-condition guards, or workarounds).
   - **NEVER** use comments or verbose explanations to justify hacks, partial fixes, or bypassed errors. If an approach fails, report the root cause plainly and stop/re-plan—do not rationalize workarounds.
4. **Non-Goals Enforcement:** Never refactor unrelated code or touch files outside the agreed plan.

## 5. Execution, Debugging & Anti-Loop Protocol

### Standard Flow

1. **Scope & Plan:** Confirm authorized domain (`docs/team/OWNERSHIP.md`), allowed write paths, and cross-domain/API/DB impact before editing.
2. **Implement:** Write minimal code matching existing codebase conventions.
3. **Validate:** Execute relevant tests against `test-db` (auth, all 4 RBAC actors, edge cases). Never claim tests passed unless actually executed.
4. **Diff Audit:** Run `git status`, `git diff --stat`, and `git diff` to verify zero out-of-scope edits or secrets. Before PR creation, run:
   `./scripts/test-guardrails.ps1 -BaseRef origin/dev -RequireTaskId`

### Debugging Protocol (Mandatory for Bugs & Failed Tests)

1. **Reproduce:** Run or write a minimal failing test/command proving the bug exists.
2. **Diagnose:** Trace execution and report exact root cause (`file:line` + log/evidence) BEFORE editing code. Pause for user confirmation on complex fixes.
3. **Minimal Fix:** Fix the root cause only. **BANNED:** hardcoding outputs, swallowing exceptions (`catch {}`), disabling checks/tests, or masking symptoms.
4. **Verify:** Re-run the reproduction test plus related suite on `test-db`.

### Circuit Breaker (2-Strike Rule)

If **2 consecutive fix attempts** fail to resolve the same error or introduce regressions:

- **STOP immediately.** Do not attempt a 3rd blind patch.
- Revert failed experimental edits if needed.
- Output `STATUS: DEBUG_BLOCKED` with: (1) exact error/log, (2) what the 2 attempts tested and why they failed, and (3) 2 distinct root-cause hypotheses for human review.

---

## 6. Boundaries, Protected Files & Stop Conditions

- **Write Scope:** Modify ONLY files within the task's authorized domain. Do not duplicate logic to bypass ownership boundaries.
- **Protected / Shared Files (explicit coordination required; smallest change only):**
  `AGENTS.md` · `backend/AGENTS.md` · `docs/{DATABASE,ERD,ARCHITECTURE,API}.md` · `docs/decisions/` · `docs/team/OWNERSHIP.md` · `docker-compose.yml` · `docker/` · `.github/workflows/` · `.coderabbit.yaml` · `database/seeders/DatabaseSeeder.php` · `backend/.env.example`
- **Migrations:** Add **new** migration files only; never edit another agent's existing migration. After an approved schema change, update `docs/DATABASE.md`, `docs/ERD.md`, and run `docs/validation_tests.sql`.

**STOP immediately and report (do not improvise) if any apply:**

1. Architecture change, ADR conflict, or new infrastructure/major dependency required.
2. Cross-domain change, ownership violation, or unauthorized protected-file edit.
3. Breaking API contract change or destructive DB operation (`DROP`, unscoped `DELETE`).
4. Ambiguous business rule or requirement unsatisfiable in current architecture.
5. **2-Strike Rule triggered** during debugging.

---

## 7. Git Workflow & Reporting

- **Branches:** `main` ← `dev` ← `p1/<task>` (Auth) | `p2/<task>` (Content) | `p3/<task>` (Learning/Infra). One branch = one small task. Never commit directly to `main` or `dev`.
- **Conflict Resolution:** Merge commits pulling `dev` into a task branch MUST use an approved task prefix (e.g., `p3: merge dev conflict resolution for <task>`), never `merge:`. Re-run guardrails against refreshed `origin/dev` before pushing.
- **Reporting Formats** (use only when completing a task, blocked, or reporting a conflict):
  - `STATUS: COMPLETE` — Task, Owner, Files changed, DB/API impact, Tests executed + result, Scope audit (`PASS`), Notes.
  - `STATUS: BLOCKED` — Task, Blocker, Domain/Owner, Files, Why, Minimal proposal, Decision needed (`DO NOT IMPLEMENT AUTOMATICALLY`).
  - `STATUS: DEBUG_BLOCKED` — Error/log, 2 failed attempts & findings, 2 root-cause hypotheses.
  - `ARCHITECTURE_CONFLICT` — Conflict, Affected files, Approved ADR, Current impl, Action (request resolution).

---

## 8. On-Demand References

Read these only when the current task requires them:

- **Runtime & Tests:** `docs/AGENT_RUNBOOK.md` · `docs/DEV_CHEATSHEET.md` (`docker compose up -d`, PowerShell task/PR scripts)
- **Architecture & Contracts:** `docs/ARCHITECTURE.md` · `docs/API.md` · `docs/DATABASE.md` · `docs/ERD.md` · `docs/decisions/`
- **Team & Workflow:** `docs/team/OWNERSHIP.md` · `docs/team/WORKFLOW.md` · `docs/team/FEATURES.md` · `docs/team/TASK_TEMPLATE.md` · `docs/team/context-packs/`
- **Local Skills:** `skills/` (install/verify once per machine via `scripts/ensure-skills.ps1`, not per session)
