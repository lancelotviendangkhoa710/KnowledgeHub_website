# Decision: Learning progress status authority

**Status**: Implemented  
**Date**: 2026-10-22  
**Author**: AI agent (p3), explicitly authorized by the user  
**Related**: LRN-002, OQ-05, `docs/API.md` v0.4

## Context

`roadmap_items.status` and `learning_progress.status` use the same enum and were both writable through the API. A user could mark an item `completed` through the item endpoint while its progress tracker was absent or still `pending`, producing contradictory roadmap and progress views. `docs/specs/learning/02-progress.md` recorded this as OQ-05 and as an implementation blocker.

The user explicitly authorized resolving OQ-05 with the most appropriate approach and updating documentation.

## Decision

1. `learning_progress.status` is the single authoritative status.
2. `roadmap_items.status` is a denormalized read mirror. The progress service updates both rows inside the same database transaction, after locking the item.
3. Item create/update endpoints reject a `status` field (`422`); clients must use `PATCH /api/learning/roadmap-items/{item}/progress`.
4. `RoadmapItem::$fillable` excludes `status`; the progress service sets it explicitly.
5. Existing data is backfilled from progress rows by migration `2026_10_22_000001_sync_roadmap_item_status_with_progress.php`.

Timestamp rules remain the ones documented in `docs/API.md`: entering `in_progress` sets `started_at` once; entering `completed` sets `completed_at` once and preserves it on retries; non-completed statuses clear `completed_at`.

## Consequences

### Positive
- Roadmap reads and progress reads always agree after any progress update.
- One writer for status removes an entire class of stale/contradictory state.
- The existing roadmap response shape keeps `items[].status` without adding a join or a new field.

### Negative
- Two rows are written per progress update (one extra row update).
- Any legacy item status without a progress row is not recoverable as an independent value; the backfill normalizes those items to `pending`.
- The data migration is one-way; `down()` cannot reconstruct previous per-item values.

### Risks
- Direct database writes to `roadmap_items.status` can still diverge. Mitigation: application code only writes it in the progress service; future direct writers must follow this ADR.
- Large tables may make the backfill migration slow. Mitigation: the update is a single set-based statement; run in a normal deployment window and monitor.

## Alternatives Considered

1. **Item status authoritative**: rejected because the dedicated progress endpoint and `learning_progress` timestamps would become misleading, and roadmap-item status alone has no timer semantics.
2. **Bidirectional sync**: rejected because item updates would need to synthesize progress timestamps and could create duplicate/ambiguous transitions.
3. **Leave both writable**: rejected; this is the original OQ-05 defect.

## Implementation Notes

- `RoadmapProgressService::update()` locks the item, writes the progress row, then updates `roadmap_items.status` only when it differs.
- `StoreRoadmapItemRequest` and `UpdateRoadmapItemRequest` declare `status` as `prohibited`.
- `RoadmapItem` no longer mass-assigns `status`.
- Data backfill: `database/migrations/2026_10_22_000001_sync_roadmap_item_status_with_progress.php`.
- Contract: `docs/API.md` v0.4, Learning section.
- Spec update: `docs/specs/learning/02-progress.md` and `00-overview.md` mark OQ-05 resolved.

## Validation

```powershell
docker compose exec -T app php artisan test tests/Feature/Learning/
docker compose exec -T app php artisan test
```

Expected:
- `test_progress_status_updates_item_status_mirror` passes.
- `test_item_endpoints_cannot_write_status` passes (422 and no status change).
- Existing progress, roadmap, and prerequisite tests remain green.
- `git diff --check` and `scripts/test-guardrails.ps1 -BaseRef origin/dev -RequireTaskId` pass.
