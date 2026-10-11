# ROLE

Act as a **Senior Software Architect, Staff Engineer, Repository Maintainer, and AI Coding-Agent Workflow Designer**.

You are working directly inside the existing **KnowledgeHub** repository/workspace.

Your mission is to **audit and refactor the workspace so that three developers can work in parallel using AI coding agents with minimal merge conflicts, minimal accidental cross-domain modifications, and clear ownership boundaries**, while preserving all currently approved product and architecture decisions.

This is not a request to merely rewrite `AGENTS.md`.

You must inspect the repository, understand its actual structure, identify the current architecture and documentation gaps, and then **modify the workspace itself** to establish a robust multi-agent development operating system.

The final result should make it difficult for an AI agent to accidentally modify another teammate's area, modify shared infrastructure without realizing it, introduce undocumented architecture changes, or create unnecessary Git conflicts.

---

# PRIMARY OBJECTIVE

Design the repository around this principle:

> **Each developer owns a bounded feature/domain and its implementation end-to-end. AI agents may read broadly but may write narrowly. Shared infrastructure and architecture are protected. Cross-domain changes require explicit coordination.**

The goal is NOT to eliminate all shared files.

The goal is to **reduce the probability that multiple developers need to edit the same files at the same time**.

The final workspace should support this workflow:

```text
Task assigned
    ↓
Agent reads repository rules
    ↓
Agent identifies owner/domain
    ↓
Agent reads only relevant architecture/contracts/docs
    ↓
Agent works inside allowed paths
    ↓
Agent implements feature
    ↓
Agent runs tests
    ↓
Agent inspects git diff
    ↓
Agent verifies ownership boundaries
    ↓
Small PR
    ↓
Review
    ↓
Merge
```

---

# CRITICAL RULE: DO NOT BLINDLY REWRITE THE PROJECT

Before modifying anything:

1. Inspect the actual repository tree.
2. Inspect the current `AGENTS.md`.
3. Inspect `README.md`.
4. Inspect all relevant files under `docs/`.
5. Inspect the existing backend structure.
6. Inspect the existing frontend structure.
7. Inspect the AI service structure if it exists.
8. Inspect database migrations.
9. Inspect routing files.
10. Inspect configuration files.
11. Inspect Docker files.
12. Inspect package manifests.
13. Inspect test structure.
14. Inspect any existing architecture documentation.
15. Inspect any existing contributor/development documentation.
16. Inspect Git configuration and repository status.
17. Search for existing instruction files such as:

* `AGENTS.md`
* `CLAUDE.md`
* `.cursorrules`
* `.cursor/rules/`
* GitHub Copilot instructions
* `CONTRIBUTING.md`
* development workflow documents
* architecture documents
* ADRs
* ownership files

Do not assume that directories or files mentioned in this prompt already exist.

Do not invent project structure.

Use the **actual repository structure** as the source of truth for path-specific rules.

---

# SCOPE OF THIS TASK

This task is primarily a **repository governance, AI-agent instruction, architecture-documentation, ownership, and collaboration workflow refactor**.

Do NOT perform a large application rewrite.

Do NOT refactor working business logic merely for style.

Do NOT replace working architecture with a new architecture.

Do NOT introduce unnecessary dependencies.

Do NOT redesign the database merely because you think another schema would be cleaner.

Do NOT convert the project into microservices.

Do NOT introduce event-driven architecture.

Do NOT introduce CQRS.

Do NOT introduce Kafka.

Do NOT introduce Kubernetes.

Do NOT introduce unnecessary abstractions.

Do NOT perform unrelated cleanup.

The purpose of this task is to make the existing workspace safer and easier for three developers + AI agents to work on in parallel.

---

# SOURCE-OF-TRUTH HIERARCHY

Establish the following hierarchy in the workspace.

When two documents disagree, agents must know which source wins.

Preferred precedence:

```text
1. Explicitly approved architecture decisions / ADRs
2. Current implemented code
3. Current database schema / migrations
4. API contracts
5. Domain documentation
6. AGENTS.md
7. Task-specific instructions
8. AI suggestions / generated assumptions
```

However, when an AI agent encounters a contradiction between approved architecture and implementation, it must NOT silently "fix" the architecture.

Instead:

```text
ARCHITECTURE_CONFLICT
- Describe the conflict
- Identify the affected files
- Identify the approved decision
- Identify the current implementation
- Do not silently redesign the system
- Request explicit team resolution
```

Previous AI suggestions must never be treated as approved architecture.

---

# PRESERVE EXISTING APPROVED KNOWLEDGEHUB DECISIONS

The current repository already defines important approved decisions.

Treat these as protected unless the repository itself contains a newer explicitly approved decision.

Do NOT silently alter them.

## Product model

KnowledgeHub is a:

> Curated learning platform with an AI Learning Companion.

It is not a social-media platform.

It is not a user-generated-content platform.

It is not a community moderation platform.

The platform is operated by an internal content team.

Users do not freely create platform courses.

---

# CURRENT TECHNOLOGY STACK

Preserve the existing approved stack unless the repository proves that implementation has legitimately changed:

```text
Backend:
Laravel 11 REST API

Database:
PostgreSQL 16 / Amazon Aurora PostgreSQL

Frontend:
Next.js / React

AI Service:
Python + FastAPI
Planned / separate service unless current implementation proves otherwise

File Storage:
Amazon S3
Planned unless current implementation proves otherwise

Infrastructure:
Docker Compose
```

Do not replace this stack.

Do not reinterpret "planned" components as already implemented.

If implementation differs from documentation, document the discrepancy rather than silently changing architecture.

---

# CURRENT BUSINESS ROLES

Preserve exactly these application roles:

```text
admin
contributor
user
```

Unauthenticated guests are not a database role.

Do not introduce:

```text
reviewer
learner
moderator
editor
author
teacher
instructor
```

unless a new approved architecture decision explicitly introduces them.

Do not create an artificial content-review workflow.

---

# CURRENT CONTENT PUBLISHING MODEL

Preserve:

```text
Contributor creates
        ↓
draft

Contributor or Admin publishes
        ↓
published
        ↓
published_version_id is set

Admin may archive
        ↓
archived
```

Do not introduce:

```text
submitted
pending_review
rejected
approved
moderated
```

unless explicitly approved by the team.

---

# CURRENT DATABASE RULES

Preserve the existing database conventions.

They are non-negotiable unless explicitly changed through an approved architecture decision.

Required conventions include:

```text
Primary keys:
UUID v4

Timestamps:
TIMESTAMP WITH TIME ZONE / Laravel timestampTz

Foreign keys:
Explicit foreign keys
Explicit cascade behavior

Enums:
VARCHAR + CHECK constraint

Never:
Native PostgreSQL ENUM unless explicitly approved

Money:
NUMERIC(12,2)

Currency:
CHAR(3)
ISO 4217
[A-Z]{3}

JSONB:
Only for genuinely variable structures

Files:
Binary files live in object storage
Database stores metadata

Soft deletes:
Required where current architecture specifies them

Secrets:
Never store plaintext passwords,
API keys,
card numbers,
or credentials
```

Do not modify these conventions during this task.

---

# CURRENT DATABASE DOMAINS

Use the existing domain model as the starting point.

Current active database tables are grouped conceptually as:

## Identity

```text
users
roles
user_roles
```

## Content

```text
categories
articles
article_versions
tags
article_tags
bookmarks
article_attachments
```

## AI Companion

```text
conversations
messages
user_memories
```

## Learning

```text
learning_roadmaps
roadmap_items
learning_progress
roadmap_item_prerequisites
```

## Payment

```text
plans
subscriptions
payments
webhook_events
```

There is also a dormant/legacy:

```text
article_reviews
```

Do NOT remove it automatically.

Do NOT reference it from new application code.

Do NOT create a drop migration without following the existing approval/ADR process.

---

# CURRENT DEVELOPMENT SEQUENCE

Preserve the approved development order:

```text
1. Core platform
   - authentication
   - users
   - roles

2. Course/content
   - categories
   - articles/courses
   - versions
   - attachments

3. AI Companion
   - conversations
   - messages
   - memories

4. RAG + long-term memory

5. AI roadmap generation

6. Premium/subscription
```

The repository workflow should reflect this sequence.

Do not encourage developers to build future systems prematurely.

---

# IMPORTANT: DESIGN FOR THREE DEVELOPERS

We have exactly three developers using AI coding agents.

Treat them as:

```text
TEAM_MEMBER_A
TEAM_MEMBER_B
TEAM_MEMBER_C
```

Do not invent real names.

Do not assume which person currently owns which domain unless the repository already specifies this.

Create an ownership model that can easily be updated later.

Use **domain/feature ownership**, not only frontend/backend/database ownership.

The preferred model is:

```text
Developer owns a feature/domain
+
Developer owns the backend implementation of that feature
+
Developer owns the frontend implementation of that feature
+
Developer owns feature-specific tests
+
Developer can propose/implement feature-local DB changes
+
Shared infrastructure remains protected
```

This prevents one developer from being permanently blocked by another developer's backend/frontend work.

---

# OWNERSHIP MODEL

Create:

```text
docs/team/OWNERSHIP.md
```

or an equivalent location appropriate for the repository.

Document ownership using bounded domains.

Start with a practical mapping based on the existing architecture.

Recommended initial ownership:

```text
TEAM_MEMBER_A
Identity / Authentication / Authorization

TEAM_MEMBER_B
Course / Content Management

TEAM_MEMBER_C
Learning / User Engagement
```

Map the actual repository paths to these domains after inspecting the codebase.

For example, conceptually:

```text
Identity:
users
roles
user_roles
authentication
authorization
profile

Content:
categories
articles
article_versions
tags
article_tags
article_attachments

Learning / Engagement:
bookmarks
learning_roadmaps
roadmap_items
learning_progress
roadmap_item_prerequisites
```

AI Companion and Payment should follow the approved development sequence rather than artificially splitting the team around features that are not yet being implemented.

When these phases begin, update ownership explicitly.

---

# OWNERSHIP MUST BE PATH-BASED

Do NOT define ownership only using vague statements like:

> "Developer A handles authentication."

Instead, document concrete paths.

Example:

```text
TEAM_MEMBER_A

Allowed write paths:
backend/app/Domain/Auth/**
backend/app/Policies/Auth/**
frontend/src/features/auth/**
tests/Auth/**

Read access:
Entire repository

Requires approval:
shared routing
shared middleware
database architecture
Docker
CI
global types
API contract changes affecting other domains
```

Use the ACTUAL repository paths.

Do not blindly copy the example paths above.

If the project uses another structure, adapt to it.

---

# READ BROADLY, WRITE NARROWLY

This is one of the most important rules in the entire workspace.

Every AI agent must be allowed to:

```text
READ broadly
SEARCH broadly
UNDERSTAND dependencies broadly
```

But it should:

```text
WRITE narrowly
```

The agent should only modify files within the task's authorized scope.

For example:

```text
TASK:
AUTH-01 Login

OWNER:
TEAM_MEMBER_A

ALLOWED WRITE:
authentication module
authentication tests
authentication-specific frontend feature

READ:
entire repository

FORBIDDEN WRITE:
content
learning
payment
AI
Docker
CI
database architecture
```

This principle must be explicitly documented in the root `AGENTS.md`.

---

# SHARED / PROTECTED AREAS

Identify actual shared paths from the repository.

Typical protected areas include:

```text
root AGENTS.md
architecture documentation
ADR directory
API contract documentation
Docker configuration
docker-compose
CI/CD workflows
environment templates
global configuration
shared types
global routing
service providers
application bootstrap
shared UI components
shared utility libraries
database architecture documentation
database validation scripts
global package manifests
```

Do not assume every example exists.

Inspect the repository and create the actual protected-path list.

These areas should require explicit coordination.

---

# NEVER CREATE A "GOD FILE"

During this refactor, look for files where many domains are likely to collide.

Examples:

```text
routes/api.php
routes/web.php
AppServiceProvider.php
bootstrap/app.php
main application entry points
global router registration
global dependency injection container
large shared configuration files
large shared React components
large utility files
```

Do not necessarily rewrite them.

Instead, identify them as integration hotspots.

Document a rule such as:

> When a task requires modifying a known integration hotspot, the AI agent must minimize the change, explain the impact, and avoid unrelated edits.

If the architecture can safely reduce collisions through existing modularization patterns, document or implement that structure only when doing so does not constitute an unapproved architectural redesign.

---

# FEATURE-BASED DEVELOPMENT MODEL

Create:

```text
docs/team/FEATURES.md
```

or equivalent.

Define features by domain rather than by technology layer.

Bad:

```text
Developer A = frontend
Developer B = backend
Developer C = database
```

Preferred:

```text
Developer A = authentication feature
Developer B = course/content feature
Developer C = learning feature
```

Each feature should ideally contain:

```text
UI
API
business logic
validation
tests
feature documentation
```

This reduces handoff dependencies.

---

# API CONTRACT AS A BOUNDARY

Create:

```text
docs/API.md
```

or an equivalent API-contract document if one already exists.

The purpose is to decouple frontend and backend development.

Document:

```text
Endpoint
HTTP method
Authentication requirement
Request schema
Response schema
Validation rules
Error format
Status codes
Pagination format
Filtering/sorting rules
```

Do not invent endpoints that do not exist.

For existing APIs:

```text
inspect actual routes/controllers/resources
```

For planned APIs:

```text
mark them as planned
```

Do not pretend planned APIs are implemented.

Use API contracts so frontend and backend agents can work in parallel without editing each other's code.

---

# DATABASE OWNERSHIP MODEL

Database work requires special protection because a database is inherently shared.

Establish:

```text
Feature-local schema changes:
Owned by the feature owner

Cross-domain schema changes:
Require explicit coordination

Architecture-level schema changes:
Require ADR / approval

Dangerous destructive changes:
Never performed automatically
```

Examples requiring explicit approval:

```text
dropping tables
dropping columns
changing primary key strategy
changing major relationships
changing domain boundaries
introducing new persistence technology
introducing RLS
introducing pgvector
major course hierarchy refactor
cross-domain schema redesign
```

Feature owners may create migrations for their domain, but agents must inspect existing migrations before creating new ones.

Do not create conflicting migrations.

Avoid multiple agents modifying the same migration file.

Prefer independent migration files.

Never edit another developer's migration merely to "make it cleaner" unless the task explicitly requires it.

---

# DATABASE DOCUMENTATION RULE

The existing database documentation and ERD must remain authoritative.

Before any schema change:

```text
read docs/DATABASE.md
read docs/ERD.md
read existing migrations
read relevant ADRs
```

After an approved schema change:

```text
update DATABASE.md
update ERD.md
update validation tests
```

Do not create a new table just because a feature "seems to need one".

Verify whether an existing table already represents the concept.

---

# CROSS-DOMAIN CHANGE PROTOCOL

Create a clear protocol.

Every AI agent must recognize the following as cross-domain changes:

```text
Changing another domain's models
Changing another domain's controllers
Changing another domain's services
Changing another domain's UI
Changing another domain's migrations
Changing shared contracts
Changing global middleware
Changing authentication behavior
Changing shared types
Changing global configuration
Changing Docker/CI
Changing core architecture
```

When a cross-domain change is required:

1. Inspect the dependency.
2. Explain why the change is necessary.
3. Identify the affected owner.
4. Identify affected files.
5. Propose the minimal change.
6. STOP before implementing it unless explicitly authorized by the task or team workflow.

Use a standardized blocked format:

```text
BLOCKED — CROSS-DOMAIN CHANGE REQUIRED

Task:
<task>

Current owner:
<owner>

Affected domain:
<domain>

Files requiring modification:
<paths>

Why this change is required:
<reason>

Proposed minimal change:
<proposal>

Risk:
<risk>

Waiting for:
<team approval / owner coordination>
```

Do not work around ownership boundaries by duplicating logic.

---

# AI AGENT STOP CONDITIONS

Agents must STOP instead of improvising when they encounter:

```text
1. Architecture change
2. Cross-domain database change
3. Shared/protected file modification
4. Breaking API contract change
5. Ownership violation
6. Destructive database operation
7. New infrastructure requirement
8. New major dependency
9. Contradiction between ADR and implementation
10. Ambiguous business rule
11. Requirement that cannot be satisfied within current architecture
12. Need to modify another team's feature
```

The agent should not "solve" these by silently changing architecture.

---

# NO UNRELATED REFACTORING

Agents must NOT do this:

```text
Task: implement login

Agent additionally:
- rewrites routing
- renames unrelated variables
- restructures controllers
- changes database architecture
- formats the entire frontend
- upgrades dependencies
- changes Docker
- changes unrelated tests
```

Agents must implement the smallest coherent change required to satisfy the task.

Rule:

> **Minimal diff is a safety feature.**

---

# GIT WORKFLOW

Create:

```text
docs/team/WORKFLOW.md
```

Document the team workflow.

Required rules:

```text
Never work directly on main.

Create one branch per task.

Use small task branches.

Use descriptive branch names.
```

Example:

```text
feature/AUTH-01-login
feature/CONTENT-02-course-list
feature/LEARNING-03-progress
```

Avoid giant branches such as:

```text
developer-a-work
frontend-work
everything-feature
```

A branch should correspond to one coherent task.

---

# PULL REQUEST RULES

Every PR should:

```text
Do one logical thing
Have a clear task identifier
Contain a small diff
Include tests
Avoid unrelated formatting changes
Avoid unrelated refactoring
State affected domain
State whether database changes exist
State whether API contracts changed
State whether shared files changed
```

The AI agent should inspect:

```bash
git status
git diff --stat
git diff
```

before declaring the task complete.

---

# MANDATORY DIFF AUDIT

Before completion, every AI agent must perform a scope audit.

Conceptually:

```text
1. List every modified file.
2. Compare every modified file against the task's allowed paths.
3. Detect any out-of-scope modification.
4. Revert unrelated modifications if they were introduced by the agent.
5. If an out-of-scope change is required, STOP and report it.
```

Agents must NEVER hide scope violations.

If the final diff contains a file outside the allowed task scope:

```text
DO NOT claim completion.
```

Instead report:

```text
OUT-OF-SCOPE MODIFICATION DETECTED
```

---

# DO NOT TRUST THE CURRENT GIT DIFF BLINDLY

Before modifying anything:

```text
git status
git diff
```

Check whether the working tree already contains modifications from a human or another agent.

If there are pre-existing changes:

* do not overwrite them
* do not revert them
* do not assume they are yours
* do not "clean up" them
* preserve them

Your agent must distinguish:

```text
pre-existing work
```

from:

```text
changes introduced during this task
```

---

# MERGE-CONFLICT MINIMIZATION

Design the workspace to minimize conflict probability.

The key principle is:

> Git conflicts are caused by overlapping edits, not simply because two developers work on related features.

Therefore:

```text
Do not force multiple developers into the same files.

Do not centralize every feature in one controller.

Do not centralize every feature in one service.

Do not create giant shared React components.

Do not create giant route files when modular routing is already supported.

Do not create giant configuration files.

Do not create giant utility modules containing unrelated business logic.
```

Where existing architecture permits, favor:

```text
feature modules
domain modules
small services
small controllers
feature-specific tests
feature-specific components
feature-specific types
```

Do not perform risky restructuring merely to satisfy this principle.

Document architectural hotspots instead.

---

# FRONTEND RULES

If a frontend application exists:

Create a frontend-specific instruction file when appropriate, for example:

```text
frontend/AGENTS.md
```

or the equivalent location.

The frontend AI rules should emphasize:

```text
feature ownership
component boundaries
API contract usage
no backend modification unless explicitly assigned
no global state changes without approval
no shared component modifications without coordination
no dependency upgrades without approval
```

Shared UI components should be treated as protected.

When a feature needs a shared component changed:

```text
prefer creating a feature-local wrapper/component
```

rather than modifying the shared component, when technically reasonable.

Do not duplicate functionality excessively just to avoid a conflict.

Use judgment.

---

# BACKEND RULES

If a backend application exists:

Create:

```text
backend/AGENTS.md
```

or equivalent.

Backend agent rules should include:

```text
domain ownership
controller/service/model boundaries
request validation
authorization
API contract consistency
transaction handling
query safety
soft-delete behavior
database conventions
tests
minimal diffs
```

Do not let feature agents casually modify authentication, authorization, providers, or global middleware.

---

# AI SERVICE RULES

If an AI service exists:

Create:

```text
ai-service/AGENTS.md
```

or equivalent.

If the AI service is not currently implemented:

```text
Do not fabricate an AI-service implementation.
Document it as planned.
```

When AI service development begins, it should have its own bounded ownership and API boundary.

---

# ROOT AGENTS.MD RESPONSIBILITY

Refactor the root `AGENTS.md` so that it becomes the **global AI-agent constitution of the repository**.

It should not primarily be a database-only instruction file.

The root file should contain:

```text
Project identity
Technology overview
Source-of-truth hierarchy
Architecture rules
Business invariants
Team collaboration rules
Ownership rules
AI read/write rules
Protected areas
Git rules
Cross-domain change rules
Stop conditions
Testing expectations
Security rules
Documentation rules
```

Do not lose useful database rules from the current file.

Move highly specialized database details into a database-specific instruction/document if appropriate, while preserving their authority.

The root `AGENTS.md` should be understandable by:

```text
Backend AI agent
Frontend AI agent
Database AI agent
AI-service agent
General coding agent
```

---

# HIERARCHICAL AGENTS FILES

If the repository's structure supports hierarchical instruction files, use them.

Potential structure:

```text
AGENTS.md

backend/
    AGENTS.md

frontend/
    AGENTS.md

ai-service/
    AGENTS.md
```

The root file defines global policies.

Domain-specific files define local implementation rules.

Avoid duplicating the entire root file inside child files.

Child instructions should specialize rather than contradict.

---

# TEAM DOCUMENTATION STRUCTURE

Create the minimum useful documentation structure.

Recommended:

```text
docs/
├── ARCHITECTURE.md
├── API.md
├── DATABASE.md
├── ERD.md
├── validation_tests.sql
├── decisions/
└── team/
    ├── OWNERSHIP.md
    ├── WORKFLOW.md
    ├── FEATURES.md
    └── TASK_TEMPLATE.md
```

But first inspect what already exists.

Do not overwrite existing valuable documentation.

Extend or reorganize it carefully.

If an equivalent document already exists, improve that document rather than creating a duplicate.

---

# ARCHITECTURE DOCUMENT

Create or update:

```text
docs/ARCHITECTURE.md
```

It should document the CURRENT architecture.

Include:

```text
System overview
Frontend
Backend
Database
AI service
Storage
Infrastructure
Domain boundaries
Dependency direction
Authentication boundary
API boundary
Database boundary
Integration hotspots
Future/planned components
```

Clearly separate:

```text
IMPLEMENTED
```

from:

```text
PLANNED
```

Never represent planned architecture as implemented.

---

# FEATURES DOCUMENT

Create or update:

```text
docs/team/FEATURES.md
```

Document:

```text
Feature
Domain
Owner
Backend paths
Frontend paths
Database tables
API endpoints
Dependencies
Status
```

Use actual repository information.

Do not invent endpoints.

Do not invent files.

Do not invent ownership identities.

Use placeholders such as:

```text
TEAM_MEMBER_A
TEAM_MEMBER_B
TEAM_MEMBER_C
```

where actual names are unavailable.

---

# TASK TEMPLATE

Create:

```text
docs/team/TASK_TEMPLATE.md
```

The template should require every task to specify:

```text
TASK ID
TASK NAME
OWNER
DOMAIN
GOAL
ALLOWED WRITE PATHS
READ-ONLY REFERENCE PATHS
FORBIDDEN PATHS
DEPENDENCIES
API CONTRACT
DATABASE IMPACT
ACCEPTANCE CRITERIA
TEST REQUIREMENTS
STOP CONDITIONS
```

Example:

```text
TASK ID:
AUTH-01

OWNER:
TEAM_MEMBER_A

DOMAIN:
Identity

GOAL:
Implement login flow

ALLOWED WRITE PATHS:
<actual repository paths>

READ:
Entire repository

FORBIDDEN:
Content
Learning
Payment
AI
Infrastructure

DATABASE IMPACT:
None

API IMPACT:
Existing login endpoint

ACCEPTANCE CRITERIA:
...

STOP IF:
Authentication architecture must change
Shared middleware must change
Another domain must be changed
```

---

# AGENT TASK EXECUTION PROTOCOL

Add this protocol to the repository instructions.

Before coding:

```text
PHASE 1 — ORIENT

Read:
- root AGENTS.md
- relevant local AGENTS.md
- task specification
- architecture docs
- relevant ADRs
- relevant API docs
- relevant database docs

Inspect:
- git status
- current branch
- related code
```

Then:

```text
PHASE 2 — SCOPE

Identify:
- owner
- domain
- allowed paths
- forbidden paths
- dependencies
- shared files
- APIs
- DB impact
```

Then:

```text
PHASE 3 — PLAN

Produce a concise implementation plan internally.

Identify possible cross-domain dependencies.

Do NOT implement architecture changes silently.
```

Then:

```text
PHASE 4 — IMPLEMENT

Modify only authorized files.

Use existing patterns.

Do not refactor unrelated code.

Do not introduce unnecessary dependencies.
```

Then:

```text
PHASE 5 — VALIDATE

Run appropriate tests.

Check formatting/linting where applicable.

Check API contract consistency.

Check database correctness.

Check authorization.

Check edge cases.
```

Then:

```text
PHASE 6 — DIFF AUDIT

Run:

git status
git diff --stat
git diff

Confirm:
- every modified file belongs to this task
- no secrets were added
- no unrelated refactor occurred
- no architecture was silently changed
- no protected file was changed without authorization
```

Then:

```text
PHASE 7 — REPORT

Summarize:
- files changed
- behavior implemented
- tests run
- database changes
- API changes
- shared-file changes
- remaining risks
```

---

# AI OUTPUT FORMAT FOR BLOCKED TASKS

Standardize blocked responses.

When an agent cannot safely continue:

```text
STATUS: BLOCKED

TASK:
<task>

BLOCKER:
<exact reason>

DOMAIN:
<domain>

OWNER:
<owner>

FILES:
<affected files>

WHY:
<why this cannot be safely completed inside current scope>

MINIMAL PROPOSED CHANGE:
<proposal>

REQUIRED DECISION:
<decision needed>

DO NOT IMPLEMENT THE BLOCKED CHANGE AUTOMATICALLY.
```

---

# AI OUTPUT FORMAT FOR COMPLETED TASKS

Standardize successful completion:

```text
STATUS: COMPLETE

TASK:
<task>

OWNER:
<owner>

FILES CHANGED:
<list>

DATABASE:
<none / migration / schema change>

API:
<none / contract changed>

TESTS:
<tests>

SCOPE AUDIT:
PASS

OUT-OF-SCOPE CHANGES:
None

ARCHITECTURE CHANGES:
None

NOTES:
<important details>
```

---

# PROTECTED ARCHITECTURE DECISIONS

Preserve the current ADR workflow.

When a change modifies:

```text
domain boundaries
database architecture
service boundaries
authentication architecture
major API architecture
course hierarchy
AI architecture
storage architecture
infrastructure architecture
```

the agent must not silently implement it.

It must propose an ADR.

Use:

```text
docs/decisions/
```

if that exists.

The agent must first:

```text
read existing ADRs
```

before proposing architectural changes.

---

# SECURITY RULES

Preserve and strengthen existing security rules.

Agents must never:

```text
Commit .env files
Commit API keys
Commit passwords
Commit cloud credentials
Commit tokens
Expose database ports publicly without explicit reason
Store plaintext passwords
Store card numbers
Disable database constraints
Use unsafe dynamic SQL
Use UPDATE without WHERE in production
Use DELETE without WHERE in production
```

Use environment variables and `.env.example`.

Never hard-code credentials.

---

# TESTING RULES

The workspace instructions should require testing appropriate to the task.

Examples:

Authentication:

```text
valid login
invalid credentials
unauthorized access
session/token behavior
```

Authorization:

```text
guest
user
contributor
admin
```

Content:

```text
draft
published
archived
ownership rules
```

Database:

```text
constraints
foreign keys
cascade behavior
soft deletes
indexes
transaction behavior
```

Queries:

```text
EXPLAIN / EXPLAIN ANALYZE where relevant
```

Pipelines:

```text
idempotency
error handling
partial failure recovery
```

Do not claim tests passed unless they were actually executed.

---

# DOCUMENTATION CONSISTENCY AUDIT

After changing instructions, compare the documentation for contradictions.

Search for:

```text
reviewer
learner role
moderator
submitted
rejected
article_reviews
course hierarchy
AI service
payment
RAG
pgvector
```

Check whether those concepts are described consistently.

Do not delete historical ADRs simply because old terminology exists.

Distinguish:

```text
Historical decision
Current decision
Planned work
Dormant legacy artifact
```

---

# DETECT DOCUMENTATION DRIFT

Audit for contradictions such as:

```text
Documentation says one stack
Code implements another

Documentation says a feature is planned
Code already implements it

Documentation says one role exists
Code contains another

Documentation says a table is active
Migrations do not contain it

Documentation says something is forbidden
Code still references it
```

Do NOT automatically rewrite the code to make it match documentation.

Instead:

```text
identify discrepancy
document it
preserve current implementation
flag for team review
```

unless the discrepancy is purely documentation drift and can be safely corrected from the implemented code.

---

# ARCHITECTURE HOTSPOT INVENTORY

Identify files that are likely to cause merge conflicts.

Examples:

```text
global routes
bootstrap files
providers
global config
Docker Compose
CI
shared components
global types
database documentation
API registry
```

Create a section in:

```text
docs/team/WORKFLOW.md
```

called:

```text
Integration Hotspots
```

For each hotspot document:

```text
Path
Why it is shared
Who maintains it
When feature agents may modify it
How conflicts should be minimized
```

If ownership cannot be determined from repository evidence:

```text
INTEGRATION_OWNER_UNASSIGNED
```

Do not invent a person.

---

# SHARED FILE RULE

For shared files:

```text
Read freely.
Write only when the task explicitly includes them.
```

When a task requires a shared-file modification:

```text
make the smallest possible change
avoid formatting unrelated sections
avoid reorganizing the file
do not combine unrelated work
```

This is especially important for:

```text
route registries
global configuration
Docker
CI
shared types
shared UI
global services
```

---

# DEPENDENCY MANAGEMENT

AI agents must not add dependencies casually.

Before adding a package:

1. Search whether an existing dependency already solves the problem.
2. Check package manifests.
3. Check whether the requested dependency is actually necessary.
4. Explain why it is required.
5. Do not upgrade unrelated packages.
6. Do not perform broad dependency upgrades as part of a feature task.

---

# NO MASS FORMATTING

Do not run formatting tools across the entire repository if doing so creates unrelated file changes.

Format only files relevant to the task where possible.

Avoid:

```text
100-file formatting diff
line-ending churn
import reordering across unrelated modules
automatic generated changes unrelated to task
```

---

# NO SECRET FILE MODIFICATION

Before completion, check whether the task accidentally modified:

```text
.env
credentials
private keys
certificates
tokens
local secrets
```

If so:

```text
STOP
DO NOT COMMIT
REPORT THE ISSUE
```

---

# WORKSPACE CLEANLINESS

The final repository should have:

```text
clear agent instructions
clear ownership
clear architecture
clear API boundary
clear database rules
clear task workflow
clear stop conditions
clear Git workflow
minimal duplicated instructions
no contradictory rules
```

Avoid creating documentation simply for the sake of creating documentation.

Every new file must have a clear purpose.

---

# IMPORTANT: DO NOT BREAK EXISTING DEVELOPMENT

Before finalizing:

Inspect:

```text
Docker configuration
migration commands
test commands
build commands
lint commands
existing CI
README instructions
```

Do not modify application code unless absolutely necessary for the instruction refactor.

If you discover that the existing documentation references commands that no longer work:

```text
do not invent replacement commands
inspect the actual project setup
update documentation only when evidence supports the change
```

---

# REQUIRED FINAL WORKSPACE STRUCTURE

After your audit, establish an appropriate structure similar to:

```text
/
├── AGENTS.md
│
├── README.md
│
├── docs/
│   ├── ARCHITECTURE.md
│   ├── API.md
│   ├── DATABASE.md
│   ├── ERD.md
│   ├── validation_tests.sql
│   │
│   ├── decisions/
│   │
│   └── team/
│       ├── OWNERSHIP.md
│       ├── WORKFLOW.md
│       ├── FEATURES.md
│       └── TASK_TEMPLATE.md
│
├── backend/
│   └── AGENTS.md
│
├── frontend/
│   └── AGENTS.md
│
└── ai-service/
    └── AGENTS.md
```

BUT:

> This is a target structure, NOT a command to blindly create every file.

Use the existing workspace structure.

If equivalent files already exist, improve them.

If a component does not exist yet, do not pretend that it exists.

---

# REQUIRED OWNERSHIP MATRIX

Create a clear matrix similar to:

| Domain         | Primary Owner   | Backend | Frontend | Database        | Shared Risk |
| -------------- | --------------- | ------- | -------- | --------------- | ----------- |
| Identity/Auth  | TEAM_MEMBER_A   | owned   | owned    | owned/protected | High        |
| Content        | TEAM_MEMBER_B   | owned   | owned    | owned/protected | Medium      |
| Learning       | TEAM_MEMBER_C   | owned   | owned    | owned/protected | Medium      |
| AI Companion   | TBD             | TBD     | TBD      | TBD             | High        |
| Payment        | TBD             | TBD     | TBD      | TBD             | High        |
| Infrastructure | Shared/Assigned | shared  | shared   | shared          | Very High   |
| Architecture   | Team approval   | shared  | shared   | shared          | Very High   |

Replace vague descriptions with actual paths wherever possible.

---

# REQUIRED TASK TEMPLATE

The final task template must be copy-pasteable.

It should look conceptually like:

```text
TASK ID:
TASK TITLE:

OWNER:
DOMAIN:

OBJECTIVE:

ALLOWED WRITE PATHS:

READ-ONLY REFERENCE PATHS:

FORBIDDEN WRITE PATHS:

DEPENDENCIES:

API CONTRACT:

DATABASE IMPACT:

SHARED FILES:

ACCEPTANCE CRITERIA:

TEST REQUIREMENTS:

STOP CONDITIONS:

EXPECTED OUTPUT:
```

Make it practical enough that a developer can paste it directly into Cline/Cursor/Copilot/etc.

---

# REQUIRED AI PROMPT TEMPLATE

Also create a reusable AI-agent task prompt section.

It should instruct the coding agent:

```text
You are implementing TASK <TASK_ID>.

First read:
<files>

You may READ:
<paths>

You may WRITE:
<paths>

You MUST NOT WRITE:
<paths>

You own:
<domain>

You must preserve:
<architecture rules>

Before coding:
inspect git status and relevant implementation.

During coding:
modify only task-related files.

If another domain must change:
STOP.

Before completion:
run tests
inspect git diff
perform scope audit
report all modified files
```

---

# FINAL VALIDATION

After making all documentation/instruction changes:

## Validate instruction hierarchy

Confirm:

```text
Root instructions are global.
Child instructions are more specific.
No child document contradicts root instructions.
```

## Validate ownership

Confirm:

```text
Every initial domain has an owner placeholder.
Shared areas are explicitly identified.
Protected areas are explicitly identified.
Cross-domain rules exist.
```

## Validate Git workflow

Confirm:

```text
No direct main workflow.
Task branches exist.
Small PRs are encouraged.
Diff auditing is mandatory.
```

## Validate AI safety

Confirm:

```text
Read broadly.
Write narrowly.
Stop on architecture changes.
Stop on ownership violations.
Stop on cross-domain changes.
No unrelated refactoring.
No secrets.
```

## Validate architecture consistency

Confirm:

```text
Current business rules remain unchanged.
Current roles remain unchanged.
Current publishing flow remains unchanged.
Current database conventions remain unchanged.
Current approved development sequence remains unchanged.
```

## Validate documentation

Search for contradictions.

Search for stale instructions.

Search for references to nonexistent paths.

Search for duplicate/conflicting agent instructions.

---

# GIT SAFETY

Before modifying files:

```bash
git status
```

After modifying files:

```bash
git status
git diff --stat
git diff
```

Never use destructive Git commands to clean up the repository unless explicitly authorized.

Do NOT run:

```bash
git reset --hard
git clean -fd
git checkout .
```

to "clean" the workspace.

Never destroy pre-existing developer work.

---

# DO NOT COMMIT

Do not create commits automatically unless the user explicitly requested a commit.

Your responsibility is to modify and validate the workspace.

Leave the repository in a reviewable state.

---

# IMPORTANT DECISION RULE

You are authorized to perform the **workspace governance/instruction refactor requested by this prompt**.

However, you are NOT authorized to silently alter the actual product architecture.

Therefore:

```text
Allowed:
- reorganize AI instructions
- create/update workflow documentation
- create ownership documentation
- create task templates
- document boundaries
- clarify existing architecture
- improve agent safety rules
- improve documentation consistency

Not allowed without explicit approved decision:
- redesign database
- redesign application architecture
- introduce new services
- change business roles
- change publishing workflow
- introduce new infrastructure
- change domain semantics
- drop database objects
- introduce major dependencies
```

---

# FINAL REPORT

When finished, provide a concise report containing:

```text
1. Repository audit summary

2. Files created

3. Files modified

4. Files intentionally left unchanged

5. Ownership model

6. Protected/shared areas

7. Integration hotspots

8. AI-agent workflow

9. Existing documentation inconsistencies discovered

10. Existing architecture inconsistencies discovered

11. Items that require future team approval

12. Validation performed

13. Remaining risks
```

For every architecture inconsistency, clearly distinguish:

```text
DOCUMENTATION ISSUE
IMPLEMENTATION ISSUE
ARCHITECTURE DECISION CONFLICT
```

Do not silently resolve architecture conflicts.

---

# MOST IMPORTANT PRINCIPLE

The final workspace should make the following behavior natural:

```text
Developer A works on Auth
Developer B works on Content
Developer C works on Learning

All three can:
- read the whole repository
- understand the overall architecture
- use AI agents
- run the project
- run tests

But each AI agent normally writes only inside its assigned domain.

Shared files are protected.

Cross-domain changes are explicit.

Architecture changes are explicit.

Git branches are small.

PRs are small.

Diffs are audited.

Unrelated refactoring is forbidden.

This is the intended operating model for the repository.
```

Do not optimize for theoretical perfection.

Optimize for:

```text
LOW MERGE CONFLICTS
LOW AI DRIFT
CLEAR OWNERSHIP
FAST PARALLEL DEVELOPMENT
MINIMAL BLOCKING
SMALL DIFFS
SAFE AI MODIFICATIONS
PRESERVED ARCHITECTURE
```

Begin by auditing the real workspace.

Then implement the refactor.

Do not merely tell me what should be changed.

**Actually modify the workspace files required to establish this system.**
