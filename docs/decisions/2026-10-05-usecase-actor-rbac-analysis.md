# Decision: Use Case & Actor Analysis – RBAC Authorization Design

**Status**: Superseded
**Date**: 2026-10-05
**Author**: AI Agent (Cline)
**Superseded by**: `docs/decisions/2026-10-05-business-model-correction.md`

---

> ⚠️ **This ADR is superseded.** The role model and use case model described here were based on an
> incorrect business assumption (social/UGC platform with Reviewer role). See the replacement ADR for
> the corrected business model (Admin + Contributor + User, course-based curated learning platform).

---

## What was wrong in this document

| Old assumption | Correct model |
|---|---|
| 5 actors: Guest, Learner, Contributor, Reviewer, Admin | 4 actors: Guest, User, Contributor, Admin |
| `learner` role | `user` role |
| `reviewer` role exists | No Reviewer role |
| Contributor submits content → Reviewer approves | Contributor publishes directly; Admin oversees |
| `article_reviews` table is active | `article_reviews` is dormant, pending drop |
| Articles as primary content unit (social feed) | Course as primary content unit (curated learning) |
| `submitted` and `rejected` article statuses | Status: `draft`, `published`, `archived` only |

Do not use the RBAC matrix or use case table from this document.
Refer to the replacement ADR for the corrected model.
