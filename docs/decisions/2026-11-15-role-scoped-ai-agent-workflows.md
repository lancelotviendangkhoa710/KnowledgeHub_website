# Decision: Role-scoped AI agent workflows

**Status**: Approved
**Date**: 2026-11-15
**Author**: Repository owner, recorded by Codex
**Related**: `2026-10-06-architecture-techstack-locked.md`, `2026-11-08-ai-companion-privacy-retention.md`, `2026-11-14-cv-storage-supabase.md`, `2026-11-14-cv-persistence-design.md`

## Context

KnowledgeHub already runs a Laravel API, PostgreSQL, and a private FastAPI AI
service. The owner wants bounded agent workflows for course creation from
YouTube videos, administrator operations, and CV evaluation. Repository search
is deferred. The existing chat and roadmap endpoints must keep working.

## Decision

1. Add pinned LangChain and LangGraph dependencies to the existing FastAPI
   service. The initial graphs are short, bounded workflows. Laravel remains the
   only application client of PostgreSQL and the authority for authentication,
   authorization, ownership, and all writes. Neither the model nor FastAPI gets
   a user bearer token, administrator session, or database credential.
2. A Contributor may request an agent-created course from a learning topic. The
   agent finds one public YouTube playlist and verifies its embeddable videos.
   One found playlist is represented as one
   KnowledgeHub course in the current `articles`/`article_versions` model. The
   agent composes the learning content; Laravel checks the requested action and
   the generated result, creates a draft owned by the authenticated Contributor,
   then publishes that version through the existing Content service. This does
   not create a YouTube playlist or upload video bytes. A future Course/Section/
   Material schema remains a separate decision.
3. Every administrator mutation requires an explicit acceptance response from
   the authenticated Admin after a preview of the exact action and target.
   Approval is bound to actor, arguments, and expiry. Laravel rechecks the
   actor's current role, policy, target state, and any step-up credential at
   execution time. Read-only tools also check role and scope. No arbitrary SQL,
   shell, generic HTTP, or unrestricted Laravel endpoint tool is exposed.
4. CV upload for evaluation is ephemeral. A preview neither stores the PDF nor
   its assessment. Only an explicit User confirmation may save both the CV and
   its assessment. The user can delete their CV and its assessment through
   owner-scoped Laravel endpoints. CV text is untrusted data, and assessment
   claims require evidence from the CV. A hash-only single-use confirmation
   claim prevents replay; existing CV storage and cleanup rules continue to
   apply.
5. Repository/project search is outside this release.
6. Use feature flags and bounded calls. No new microservice, database, Redis,
   vector index, or persistent LangGraph checkpoint is required for the first
   rollout. A durable checkpoint, if later justified, needs a separate schema,
   retention, privacy, and recovery review. Never log prompts, PDF contents,
   service tokens, or raw private tool results.

## Consequences

### Positive

- Existing authentication, Content publication, CV cleanup, and deployment
  boundaries remain authoritative.
- Explicit Admin acceptance makes mutating operations reviewable and auditable.
- The first workflows can be rolled back by disabling their feature flags.

### Negative

- Additional Python dependencies and model calls increase build size, latency,
  and maintenance cost.
- An agent cannot promise a video or assessment is correct merely because a
  model returned it. Laravel and source adapters must validate outputs.
- CV assessment and administrator approvals introduce new contracts and
  persistence requirements that need focused migrations and tests.

### Risks

- Prompt injection in YouTube metadata, CV text, or chat can request forbidden
  actions. Tool allowlists, structured schemas, and Laravel policy checks bound
  execution; prompt text alone is not an authorization mechanism.
- Roles, ownership, and target state can change between preview and approval.
  Reauthorize and revalidate during execution, and make retries idempotent.
- Provider or source API failure can leave partial external activity. Keep the
  first workflows synchronous and bound writes to transactions where possible.

## Alternatives Considered

1. **Put the agent in Laravel:** rejected for the first release because the
   approved AI boundary and model integration already live in FastAPI.
2. **Give FastAPI database or Admin credentials:** rejected because it would
   bypass the Laravel policy boundary.
3. **Create a new playlist/video schema immediately:** deferred until the team
   designs the broader Course/Section/Material hierarchy.
4. **Add vector search or Redis:** no demonstrated need for these workflows.

## Implementation Notes

- Work in separate AI, Content, and Identity/Auth tasks with explicit API
  contracts and owner review. The owner approved the feature scope and this
  architecture on 2026-11-15.
- First deploy the agent runtime behind a disabled feature flag. Add the
  Contributor flow, CV confirmation, and Admin approval flow independently.
- Use isolated Compose `test-db` for automated Laravel tests. Never apply a
  migration or run tests against shared Supabase data as part of development.

## Validation

- Test Guest/User/Contributor/Admin for every route and tool.
- Verify foreign ownership, downgraded roles, changed targets, forged approvals,
  replayed requests, model-invented tool names, and prompt injection.
- Verify a generated course uses only validated video IDs and the published
  version belongs to the new Contributor-owned article.
- Verify CV preview stores nothing; confirmation stores only the owner's CV and
  assessment; deletion removes both.
- Measure agent latency, tool attempts, model calls, tokens, and rollback using
  feature flags without changing existing chat or roadmap behavior.
