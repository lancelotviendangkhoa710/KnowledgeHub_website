# KnowledgeHub agent workflows: master plan

**Status:** Approved for implementation by the repository owner on 2026-11-15.
**Decision:** `docs/decisions/2026-11-15-role-scoped-ai-agent-workflows.md`.
**Branch:** `p3/agent-workflows` from `origin/dev`.

## Outcome and boundaries

Use LangChain and LangGraph inside the existing FastAPI AI service for three bounded workflows. Laravel authenticates the actor, enforces policy and ownership, validates all AI output, and performs every database write. The AI service receives only task data and an internal service token. It receives no user bearer token, administrator credential, or database credential. Existing chat, roadmap, content, and CV endpoints continue to work.

| Workflow | Actor | Result | Persistence gate |
| --- | --- | --- | --- |
| YouTube course | Contributor | One public YouTube playlist found by the agent becomes one KnowledgeHub course with agent-written lesson content, created as draft and published using the existing Content service | Authenticated create/publish policy and validated playlist/video IDs; one transaction |
| Admin operations | Admin | A proposal limited to user role or account status, then the chosen operation | Explicit Admin acceptance of exact actor, target and arguments; recheck role, policy, target state, and step-up credential before execution |
| CV assessment | Authenticated User, Contributor, or Admin acting on their own CV | Evidence-based assessment preview | Upload alone saves nothing; explicit confirmation saves CV and assessment; owner can delete both |

GitHub project search is deferred. The first release adds no database server, microservice, Redis, vector index, generic tool executor, or LangGraph checkpoint. The existing PostgreSQL database may receive only the reviewed additive migration for CV assessment, single-use Admin approvals, and hash-only CV confirmation claims. No automated test, reset, or destructive command runs against shared or cloud data.

## Implementation sequence

1. **Contract and feature flags.** Record the approved ADR and exact Laravel/FastAPI request/response contracts. Add separate flags for the three workflows, default off. Existing routes keep their behavior.
2. **AI service.** Add pinned LangChain/LangGraph dependencies. Implement short StateGraphs with bounded inputs, output schemas, model timeouts, allowlisted actions, and source validation. The YouTube adapter checks public, embeddable videos before the course payload can leave the AI service. Treat CV text, video metadata, and natural-language instructions as untrusted input.
3. **Laravel integration.** Add authenticated, rate-limited endpoints. Reuse existing ArticleService, ArticlePolicy, AdminUserService, UserPolicy, UserCvService, and internal AI client patterns. Never make a mutating tool directly callable by the model. Admin proposal acceptance is bound to one actor, one target, one action and arguments, expiry, and single-use semantics.
4. **Frontend.** Add role-appropriate entry points. Show the exact Admin proposal before a separate accept action. CV assessment shows an ephemeral preview; saving uses an explicit confirmation and the User retains a delete control. Contributor can review generated course outcome and reach the published course.
5. **Verification.** Test all four actors, ownership, forged/expired/replayed approvals, role downgrade between preview and execution, invalid video IDs, prompt injection in external metadata/CV text, CV preview without persistence, confirm and delete, upstream failures, and unchanged legacy endpoints. Run Laravel tests only through the disposable Compose `test-db` bootstrap.
6. **Rollout.** Deploy behind disabled flags, configure private provider/YouTube secrets, run smoke tests with controlled accounts, then enable one workflow at a time. Rollback is flag-off; additive CV data and existing endpoints remain valid.

## Work packages and dependencies

| Package | Deliverable | Depends on | Done when |
| --- | --- | --- | --- |
| WP0: decision and contract | Approved ADR, `/api/ai/...` and internal `/v1/agents/...` contracts, privacy and role matrix | Owner approval | Contract matches Laravel, AI service, frontend and this plan |
| WP1: agent runtime | Pinned dependencies; bounded course, CV and Admin graphs; YouTube verification; safe logs | WP0 | Python suite passes; invented IDs/actions and untrusted text cannot escape output schemas |
| WP2: Laravel authority | New routes, policies/service reuse, one additive migration, approval/confirmation claims, cleanup | WP0–1 | Role/ownership tests pass; all writes are authorized and replay-safe |
| WP3: frontend | Contributor, Admin and CV pages; explicit accept/consent/delete controls | WP2 contract | Production build passes and every new route has a clear role-appropriate entry point |
| WP4: integration | Update branch against `origin/dev`, reconcile shared Studio page, run security/contract review | WP1–3 | Clean diff and guardrails; no unrelated files or secrets |
| WP5: staging | Forward-only migration with recovery plan, private credentials, real provider/YouTube smoke tests, 20-attempt benchmark | WP4 | All acceptance gates pass before a flag is enabled |

The code for WP0–3 is present on `p3/agent-workflows` as of 2026-11-16. WP4 is necessary because `origin/dev` gained a Studio rewrite after this branch began; the new course link must be moved into that component without discarding either change. WP5 is pending: no YouTube API key is configured locally, feature flags default off, and no live DeepSeek/YouTube call or migration has been run.

### Safe test and migration order

1. Review the additive migration, backup/recovery procedure, and actual target connection. Never run it against shared data as a side effect of tests.
2. Laravel Feature tests currently use `RefreshDatabase`, which issues a reset. Do not execute them under the owner's no-reset constraint. Convert the new suite to a forward-only schema setup plus transaction rollback on the disposable Compose `test-db`, verify the test bootstrap's connection guard, then run the focused suite. Do not alter or reset the shared database.
3. Run Python unit tests, PHP syntax and route checks, frontend build, `git diff --check`, and repository guardrails. These checks require no database reset.
4. Rotate any local credentials exposed in the earlier Compose inspection if its command transcript is accessible beyond the operator session. Configure new private secrets without copying values into repository files or logs.
5. After integration passes, apply the reviewed forward migration in staging, test disabled flags first, then enable CV, Contributor course, and Admin operations separately. A failed gate means flags stay off; rollback turns the affected flag off without dropping tables.

### Benchmark record

For each workflow, use 20 representative nonproduction requests and record p50/p95 end-to-end latency, success/error rate, model input/output tokens, provider cost, YouTube quota calls, and human review of factual accuracy. Include hostile CV text, hostile playlist metadata, invented tool/action output, and a mid-request role downgrade. Compare CV inference with an equivalent existing AI call only when input/output scope is comparable; the new course and Admin operations have no like-for-like baseline. Record this limitation explicitly.

## Acceptance gates

- Authorization: 0 unauthorized writes, cross-user reads, or unapproved Admin mutations in the regression suite. The backend rejects malformed/model-invented actions and cannot be induced to invoke arbitrary SQL, shell, or HTTP tools.
- Course: every stored video ID belongs to the one verified source playlist; the published version and article belong to the requesting Contributor; a failed publish leaves no partial course.
- CV: preview creates no `user_cvs` row or storage object; only owner confirmation stores assessment with the CV; deletion removes both and denies subsequent access.
- Reliability: provider, YouTube, and Storage failures return bounded safe errors. Replayed approval cannot repeat a mutation. Existing AI chat/roadmap and content flows pass their regression tests.
- Measurement: record p50/p95 latency, model calls, token usage, YouTube quota calls, error rate, and per-success cost for at least 20 representative attempts per workflow in a nonproduction environment. Compare shared AI operations against the prechange baseline using the same inputs; report feature-specific workflows separately rather than claiming an apples-to-apples speedup. No workflow is enabled broadly without the measurement report and the security gate above.

## Ownership and review

This implementation spans AI Companion, Content, Identity/Auth, and frontend. The repository owner authorized all scopes for this task. Keep changes in their domain files, use a new migration only, audit the full diff, and split review into small logical PRs before merge to `dev`. Production activation and migration execution require an operator-reviewed deployment and recovery procedure; implementation does not perform either against shared data.
