# Decision: CV persistence and immediate account deletion

**Status**: Approved

**Date**: 2026-11-14

**Author**: AI agent, recording the repository owner's approval on 2026-11-14

**Related**: `2026-11-14-cv-storage-supabase.md`, `2026-11-08-ai-companion-privacy-retention.md`, `docs/API.md` §7

## Context

The approved CV storage decision permits a private Supabase Storage bucket for
an explicitly saved best CV. It requires a separately reviewed schema and
access design before implementation. Account soft-deletion must remove the CV
and its derived active data before returning success. The existing account
deletion transaction is owned by Identity/Auth; the CV feature is owned by AI
Companion. This design needs both owners' review.

## Decision

1. Add AI-owned `user_cvs` rows with UUID v4 primary keys, `user_id` with an
   explicit `ON DELETE CASCADE` foreign key, an opaque private Storage object
   key, safe display filename, byte size, extracted text of at most 12,000
   characters, consent timestamp, `status` constrained to `active` or
   `pending_delete`, and `timestampTz` timestamps. A partial unique index on
   `user_id WHERE status = 'active'` allows only one current CV while retaining
   pending cleanup records. Clear extracted text when marking a row pending.
   Do not store PDF bytes, public URLs, provider prompts, or access keys in PG.
2. Use a dedicated private bucket and Laravel's server-side S3-compatible
   filesystem adapter. Keep the endpoint, bucket and access keys only in the
   Laravel runtime. All browser requests go through owner-scoped Laravel
   endpoints. Do not grant browser Data API access to `user_cvs`; enable RLS
   on the table in the exposed schema as defense in depth.
3. Provide authenticated endpoints to get current CV metadata, upload or
   replace with explicit consent, download the source PDF, and delete it.
   A non-opted-in AI-05 preview remains ephemeral. Reject invalid, encrypted,
   textless or oversized PDFs using the existing extractor before saving.
   Return no extracted CV text in ordinary metadata responses.
4. On replacement, mark the previous CV `pending_delete` and clear its text
   before deleting its Storage object and derived data. On user-requested
   deletion, do the same before removing the object and row. Retry pending
   cleanup after partial failures; never retrieve a pending row. Do not
   overwrite a key in place. Return an error if replacement or deletion has
   not finished so the UI cannot claim that old data was removed.
5. The Identity/Auth account deletion service must invoke the AI-owned CV
   cleanup after password and last-admin checks and before soft-deleting the
   user. If deletion of any active or pending CV object cannot be verified,
   abort account deletion with a safe error; never return success while a CV
   object remains in active Storage. Keep
   the integration explicit and covered by an Auth-owned test.
6. This feature stores source text for future RAG but does not create
   embeddings or inject saved CV content into prompts. That work needs a
   separate approved RAG/indexing design. The future retrieval path must be
   owner-scoped and treat CV text as untrusted data.

## Consequences

### Positive

- Explicit consent and a single current CV simplify user control.
- The source PDF can be reprocessed later without another upload.
- Immediate account deletion has an explicit failure condition.

### Negative

- Storage and database changes are not atomic; cleanup and retry state are
  needed for partial failures.
- A private S3-compatible adapter adds a package and server configuration.
- An active CV consumes both Storage capacity and database space.

### Risks

- Server Storage keys have broad access. Limit their use to Laravel, rotate
  them when exposed, and never log or send them to the browser.
- Supabase database and Storage backups may retain deleted bytes for their
  provider-defined period. Document actual backup retention and disclose this
  limit before launch; do not promise physical erasure from backups instantly.
- The existing AI provider receives CV text for roadmap analysis. The current
  AI privacy ADR records provider terms and retention as open; include that
  disclosure in the opt-in notice before public launch.
- Account deletion crosses Identity/Auth and AI ownership. Obtain both owners'
  review of the call site, transaction behavior, and tests.

## Alternatives Considered

1. **Add the CV to `user_memories`**: Rejected because memory rows are small
   user-entered facts with tombstone deletion, while CVs require source-file
   storage and immediate removal.
2. **Save only extracted text**: Rejected by the approved storage decision,
   which preserves the source PDF for future reprocessing.
3. **Delete the CV in a daily purge**: Rejected because the owner requires
   deletion when account soft-delete succeeds.

## Implementation Notes

- The implementation PR should include a new migration, minimal Laravel API
  and Auth integration, frontend opt-in and CV controls, focused tests, and
  the matching API/database/ERD documentation changes. Deploy and verify the backend and migration before enabling the frontend controls.
- No migration or Storage bucket creation may be applied to shared Supabase
  until deployment credentials, a recovery plan, and the active-data deletion
  path are reviewed. Test against disposable Compose `test-db` and a fake or
  isolated Storage endpoint.
- Confirm the actual Supabase Storage S3 compatibility and authentication
  documentation when implementing the adapter.

## Validation

- Guest access is rejected. A user, contributor, or admin can manage only
  their own CV; another user's CV is never readable through the API.
- Default unchecked consent and a normal preview persist nothing. An explicit
  upload persists exactly one current CV; replacement removes the old one.
- CV deletion removes source and text; account deletion cannot succeed while
  source deletion fails. Simulate partial Storage and database failures.
- Verify no secrets, raw CV text, or public object URLs appear in logs or
  browser bundles. Run guardrails and disposable database tests.
