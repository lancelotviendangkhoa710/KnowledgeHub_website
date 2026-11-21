# Decision: Owner-scoped persistent CV-RAG embeddings

**Status**: Approved
**Date**: 2026-11-21
**Author**: AI agent, recording owner-approved AI-DEMO-01B scope
**Related**: `2026-11-14-cv-persistence-design.md`, `2026-11-14-cv-storage-supabase.md`, `2026-11-08-ai-companion-privacy-retention.md`

## Context

`user_cvs` already provides one owner-scoped, explicitly-consented, active CV with private source storage and bounded extracted text. `conversations` and `messages` already provide owner-scoped durable history and atomic/idempotent message pairs. AI-DEMO-01B adds the complete Mini-RAG pipeline without introducing another source-CV, question, answer, or history store:

```text
active user_cvs text (Document Loader)
  -> page-aware chunks (Text Splitter)
  -> local E5 embeddings (Embedding)
  -> exact owner-scoped pgvector search (Vector Retriever)
  -> selected context only -> DeepSeek answer
  -> existing conversations/messages + application citations
```

## Decision

1. Laravel is the sole authorization and database authority. It selects the authenticated owner’s active CV, checks the conversation owner, selects/filters vectors, persists messages, and constructs citation metadata. FastAPI has no database credentials, never receives an owner identifier, and only accepts bounded text, a query, or Laravel-selected chunks over an `X-Service-Token` private contract.
2. The embedding model is local `intfloat/multilingual-e5-small`, license MIT, 384 dimensions, at immutable reviewed Hugging Face revision `fd1525a9fd15316a2d503bf26ab031a61d056e98`. `sentence-transformers==6.3.0` is pinned. Chunks are encoded as `passage: <chunk>` and questions as `query: <question>` with L2 normalization. Model and revision must match for indexing and retrieval.
3. Add `user_cv_indexes` (one-to-one with `user_cvs`) and cascading `user_cv_chunks`. They use UUID v4 keys, `timestamptz`, VARCHAR plus CHECK state constraints, explicit `ON DELETE CASCADE` foreign keys and FK indexes. The vector extension is installed as `extensions.vector`; embeddings are `extensions.vector(384)`.
4. Enable RLS as defense in depth and revoke all direct table privileges from `anon` and `authenticated`; these tables are not a browser Data API surface. Laravel remains the only application access path.
5. Retrieval is exact cosine distance with `<=>`, restricted to the caller’s active CV and an index in `ready` state for the approved model/revision. It applies a configured similarity threshold and returns at most three chunks. V1 deliberately has no HNSW/IVFFlat index because each user has one bounded CV; revisit only after `EXPLAIN ANALYZE` demonstrates need.
6. Indexing is bounded and synchronous in V1. Saving/replacing an active CV creates or resets the index to `pending`; Laravel sends bounded extracted text to FastAPI for page-aware chunking and embeddings. In one database transaction it replaces all chunks and marks the index `ready`. Failure marks it `failed`; no partial chunks are retrievable. A retry command handles active pending/failed indexes idempotently.
7. Replacing/deleting a CV and account cleanup invalidate retrieval before source cleanup; the database cascade removes its index and chunks. Retrieval never uses `pending_delete` CVs or indexes other than `ready`. Historical message citations are metadata only and resolve as unavailable after their CV/version is gone.
8. `mode=cv` is opt-in and independently feature-gated; omitted `mode` remains existing `chat`. Missing active CV or a non-ready index returns safe `409`; foreign/unknown conversations remain `404`; guests remain `401`. The existing message-pair transaction and durable idempotency remain in force.
9. FastAPI uses `langchain_openai.ChatOpenAI` for DeepSeek generation, not a second direct provider client. It treats CV text, history and questions as untrusted data, sends at most three Laravel-selected chunks, and returns a fixed sentinel when support is insufficient. Laravel stores only the citation allowlist (CV/version, page, bounded excerpt, chunk id, model/revision, similarity), never vectors or provider prompts. Citations are application-generated from retrieved rows, never model-authored.

## Consequences

### Positive

- The four Mini-RAG stages are explicit while ownership is checked before vector retrieval.
- Source CV, history, and citations use existing lifecycle-controlled records.
- Exact retrieval is deterministic for the bounded corpus.

### Negative

- Local model image size/startup cost increases.
- Top retrieved CV excerpts are sent to DeepSeek for generation; provider/privacy conditions remain those recorded in the AI privacy ADR.

### Risks and mitigations

- **Cross-user leakage**: Laravel applies owner/CV/index filters before `<=>`; feature tests cover a second user.
- **Stale source data**: replacement/deletion cascades chunks and rejects pending/deleted states.
- **Ungrounded answers**: the model receives only up to three selected chunks; fixed no-answer sentinel and citation allowlist prevent fabricated references.
- **Migration rollback**: `down()` removes derived data only and must run only in disposable environments; it intentionally does not drop the shared `vector` extension.

## Alternatives considered

1. **FastAPI direct database retrieval**: rejected because it bypasses Laravel ownership authorization.
2. **ANN in V1**: rejected because approximate indexes can under-return after owner filtering.
3. **Model-generated citations**: rejected because page and excerpt evidence must come from retrieved rows.
4. **Embedding-provider API**: rejected because CV embeddings remain local.

## Validation and rollout

Use deterministic local embedding and DeepSeek mocks to test Vietnamese and English answers/paraphrases, no-answer, prompt injection, cross-user isolation, stale/failed index, revision mismatch, page citations, replacement/deletion, retry, atomic message pairs, constraints, cascades, RLS and exact vector queries. Run only against disposable services. Deploy code first, apply the reviewed migration through deployment workflow, verify extension/schema/RLS/index state, index test users, and enable the separate feature flag last. Never apply this migration from an agent workstation or shared/cloud database.
