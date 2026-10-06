# docs/team/TASK_TEMPLATE.md â€” AI Agent Task Template

**Usage**: Copy the template, fill in all fields, paste directly into Cline / Cursor / Copilot.

---

## Task Specification Template

```
TASK ID:    <DOMAIN-NN>   e.g. AUTH-01, CONTENT-02, LEARN-03
TASK TITLE: <short name>
OWNER:      <TEAM_MEMBER_A | B | C>
DOMAIN:     <Identity/Auth | Content | Learning | AI Companion | Payment | Infra>
BRANCH:     <p1/ | p2/ | p3/><task-name>

OBJECTIVE:
  <What behavior does this task add? What problem does it solve?>

â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ SCOPE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

ALLOWED WRITE PATHS:
  backend/app/Http/Controllers/<Domain>/
  backend/app/Http/Requests/<Domain>/
  backend/app/Models/<Model>.php
  backend/app/Policies/<Policy>.php
  backend/app/Services/<Domain>/
  database/migrations/<timestamp>_<desc>.php
  tests/Feature/<Domain>/  tests/Unit/<Domain>/
  docs/API.md                    â† if endpoint new/changed
  docs/DATABASE.md               â† only after approved schema change

READ-ONLY:
  AGENTS.md / backend/AGENTS.md / docs/ARCHITECTURE.md
  docs/API.md / docs/DATABASE.md / docs/ERD.md / docs/decisions/
  docs/team/OWNERSHIP.md
  backend/routes/api.php         â† read before adding routes
  database/migrations/           â† read ALL before new migration

FORBIDDEN WRITE:
  <other domains' controllers, models, migrations>
  backend/app/Http/Middleware/   â† unless explicit in task
  backend/app/Providers/         â† unless explicit
  backend/bootstrap/app.php      â† unless explicit
  docker-compose.yml             â† unless infra task
  .github/workflows/             â† team approval
  AGENTS.md / docs/decisions/    â† team approval

â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ CONTRACTS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

DEPENDS ON:
  <feature IDs or endpoints required to exist first>

API CONTRACT:
  METHOD: <GET|POST|PUT|DELETE|PATCH>   PATH: <approved path>
  AUTH:   <none | exact approved mechanism and role>
  REQUEST:  <approved JSON schema>
  RESPONSE: <approved success JSON schema>
  ERRORS:   <approved status codes and schemas>

DATABASE IMPACT:
  <None | New migration: description | Existing table: which>
  Cross-domain table needed? STOP first.

SHARED FILES:
  <None | backend/routes/api.php â€” <domain> routes only>

â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ ACCEPTANCE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

[ ] <behavior 1>    [ ] <behavior 2>

Authorization:
[ ] Guest: <allowed/forbidden>      [ ] User: <allowed/forbidden>
[ ] Contributor: <allowed/forbidden> [ ] Admin: <allowed/forbidden>

â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ TESTS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

[ ] Happy path â€” valid request, authorized user
[ ] Validation failure â†’ 422
[ ] Wrong role â†’ 403     [ ] Wrong owner â†’ 403
[ ] Not found â†’ 404
[ ] DB constraint violation produces expected error
[ ] Soft-deleted records excluded

Command: docker compose exec app php artisan test tests/Feature/<Domain>/

â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ STOP IF â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

[ ] Change to another domain's models/controllers/services
[ ] Change to global middleware or service providers
[ ] Database architecture redesign
[ ] Breaking change to existing API endpoints
[ ] New major dependency
[ ] Ambiguous business rule / ADR contradiction

â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ OUTPUT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

Complete:
  STATUS: COMPLETE
  TASK: <ID> <name>     OWNER: <TEAM_MEMBER_X>
  FILES CHANGED: <list>
  DATABASE: <none | migration: path>
  API: <none | METHOD /path â€” IMPLEMENTED in docs/API.md>
  TESTS: <command + result>
  SCOPE AUDIT: PASS    OUT-OF-SCOPE: None    ARCHITECTURE: None changed

Blocked:
  STATUS: BLOCKED
  BLOCKER: <reason>   FILES: <paths>   WHY: <reason>
  PROPOSAL: <minimal change>   DECISION: <what team must resolve>
  DO NOT IMPLEMENT THE BLOCKED CHANGE AUTOMATICALLY.
```

---

## AI Agent Prompt (paste into agent chat)

```
You are implementing TASK <TASK_ID>: <TASK_TITLE>.

FIRST READ before coding:
  AGENTS.md â†’ backend/AGENTS.md â†’ docs/ARCHITECTURE.md
  â†’ docs/API.md â†’ docs/DATABASE.md â†’ docs/ERD.md
  â†’ docs/decisions/ â†’ docs/team/OWNERSHIP.md
  â†’ database/migrations/ â†’ existing domain code

INSPECT: git status | git diff | current branch

YOU MAY READ:  entire repository
YOU MAY WRITE: <ALLOWED WRITE PATHS from task spec>
FORBIDDEN:     <FORBIDDEN WRITE PATHS from task spec>

PRESERVE (non-negotiable):
  - 3 roles: admin, contributor, user only
  - Publishing: draft â†’ published â†’ archived (no review step)
  - UUID PKs, timestampTz, VARCHAR+CHECK enums, explicit FKs
  - Soft deletes on users + content tables
  - No plaintext secrets in DB
  - Minimal diff â€” no unrelated refactoring

IF ANOTHER DOMAIN MUST CHANGE: STOP â†’ BLOCKED format.

BEFORE COMPLETION:
  1. Run tests
  2. git diff --stat / git diff
  3. Verify every modified file is in allowed paths
  4. Report STATUS: COMPLETE format
```

---

## Illustrative Example â€” Do Not Treat as Approved Contract

This example demonstrates formatting only. No login route, token format, controller, or test path currently exists in the tracked workspace.

```
TASK ID: <assigned ID>   TITLE: <approved title>
OWNER: TEAM_MEMBER_A     DOMAIN: Identity/Auth     BRANCH: p1/<task>

OBJECTIVE:
  <Approved task objective. Do not invent endpoint or auth behavior.>

ALLOWED WRITE:
  <Existing tracked paths created or explicitly authorized by the task>

DATABASE: <None | approved migration path>
API:      <TBD until approved contract is recorded in docs/API.md>

STOP IF: The task requires application bootstrap, a new auth mechanism,
         global middleware, or another domain change outside authorized scope.
```
