# Decision: Store opted-in CV files in Supabase Storage

**Status**: Approved

**Date**: 2026-11-14

**Author**: AI agent, recording the repository owner's approval on 2026-11-14

**Related**: `2026-10-06-architecture-techstack-locked.md`, `2026-10-07-use-supabase-postgresql.md`, `2026-11-08-ai-companion-privacy-retention.md`, `docs/API.md` §7

## Context

AI-05 accepts an optional PDF CV for a single roadmap preview. The PDF and its
extracted text are not persisted. The product owner wants a separate feature in
which the learner can explicitly mark a CV as their best CV and save it for
future personalized retrieval. The opt-in must be off by default. The learner
must be able to replace and delete the saved CV; account deletion must remove
the CV and derived retrieval data.

The approved architecture currently names Amazon S3 for binary files and adopts
Supabase PostgreSQL only. It does not adopt Supabase Storage. This decision is
therefore an explicit, CV-specific amendment if approved. It does not change
Content attachments or authorize a general storage migration.

## Decision

1. Store an opted-in learner CV PDF in a **private Supabase Storage file bucket**.
   Store no PDF binary in PostgreSQL. Laravel remains the only application API
   exposed to the browser; the browser does not receive Supabase credentials or
   directly access the Storage bucket.
2. Laravel checks the authenticated user's ownership before every upload,
   download, replacement, and deletion. Storage credentials stay server-side.
   Admin and operations users have no application-level read path to another
   learner's CV by default.
3. A CV is saved only after a separate, affirmative learner action. The consent
   control is unchecked by default and explains that extracted CV content may
   later be used to personalize AI responses. An ordinary roadmap preview keeps
   the current non-persistent behavior.
4. Keep one designated current best CV per learner. Replacing it invalidates
   prior extracted text and retrieval derivatives. Deleting the CV or account
   must remove the file and all associated extracted text, chunks, embeddings,
   and references. Account soft-deletion must remove them immediately, before
   the account deletion request succeeds. A partial failure must be detectable
   and retried; the application must not retrieve stale content while cleanup
   is pending.
5. The database may hold only the metadata and extracted/derived text needed for
   the approved retrieval design, associated with the owner. The schema,
   embedding provider/model, indexing, access rules, backup limitations, and AI
   provider disclosure require a separate reviewed design before implementation.
   This ADR does not approve RAG implementation.

## Consequences

### Positive

- A learner can deliberately preserve the source PDF for future reprocessing.
- File storage and the existing managed PostgreSQL project can be operated in
  one Supabase account while Laravel remains the authorization boundary.

### Negative

- Supabase Storage introduces a new service and server-side credentials.
- The PDF, extracted text, and retrieval derivatives require coordinated
  replacement and deletion; PostgreSQL transactions alone cannot atomically
  change Storage objects.
- Supabase's S3 API is compatible with common operations, but does not implement
  every Amazon S3 feature. This decision is not a drop-in change for existing
  Content attachment storage.

### Risks

- CVs contain personal data. Use a private bucket, opaque object keys, owner
  checks in Laravel, minimal logging, and no public URLs.
- Server-side Storage access keys can bypass Storage RLS. Keep them private,
  restrict operational access, and do not expose them to the browser.
- Object removal and database cleanup can fail independently. Record cleanup
  state, retry failures, and exclude pending-deletion data from retrieval.
- The free tier has quotas and no automatic database backups. Monitor usage
  and define recovery expectations before launch.

## Alternatives Considered

1. **Amazon S3 for CVs**: Already named in the architecture, but the owner chose
   Supabase Storage for this feature. Amazon S3 remains the planned location for
   other binary content unless separately changed.
2. **PDF in PostgreSQL**: Rejected because the platform convention keeps file
   binaries out of the database.
3. **Only extracted text, without the source PDF**: Smaller storage footprint,
   but prevents a learner from downloading the saved CV and prevents improved
   extraction without another upload.

## Implementation Notes

- Create this feature in a branch and PR separate from AI-05. Do not add CV
  persistence to PR #63.
- Define the CV metadata schema and owner-scoped Laravel endpoints in the
  implementation design. Coordinate account deletion with Identity/Auth and
  AI-derived data deletion with the AI Companion owner. Add only new migrations.
- Keep the existing AI-05 preview contract unchanged until a separate API
  change is reviewed. Do not apply migrations to the shared Supabase database
  from an agent workspace.
- Supabase references: [Storage overview](https://supabase.com/docs/guides/storage),
  [Storage access control](https://supabase.com/docs/guides/storage/security/access-control),
  [S3 compatibility](https://supabase.com/docs/guides/storage/s3/compatibility),
  [S3 authentication](https://supabase.com/docs/guides/storage/s3/authentication).

## Validation

- Confirm an ordinary preview does not persist a CV, while an explicit opt-in
  does. Verify guest, owner, and another user against each CV operation.
- Verify replacement and deletion remove the old file and make old extracted
  text and embeddings unavailable, including after a simulated partial failure.
- Verify account deletion invokes coordinated cleanup and that logs, browser
  bundles, and API responses do not expose Storage credentials or CV text.
- Test only against disposable local services and the Compose test database;
  inspect and approve a recovery plan before any shared/cloud schema change.
