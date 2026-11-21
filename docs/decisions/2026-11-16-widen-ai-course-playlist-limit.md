# Decision: Widen AI course playlist limit to 20 videos

**Status**: Approved
**Date**: 2026-11-16
**Author**: Repository owner, recorded by AI agent
**Related**: `2026-11-15-role-scoped-ai-agent-workflows.md`, `../AGENT_WORKFLOWS_MASTER_PLAN.md`

## Context

The approved course workflow accepted only public playlists with 2–6 videos so
the whole playlist could become one course. A smoke check against the YouTube
Data API showed that search rarely surfaces playlists that small: most topics
returned playlists with 9–292 videos, so course generation failed with
`insufficient_verified_videos` even though the source data and provider were
healthy. The three-video cap for normal requests also made the 20-attempt
benchmark gate unreachable for generic topics.

## Decision

Raise the maximum accepted playlist size to 20 videos. A request may still ask
for as few as 2. Existing rules stay unchanged: the playlist must be public, the
complete ordered playlist becomes the course, and every video must be public,
embeddable, and not a live broadcast. Laravel continues to validate the
returned lessons and owns the publish transaction.

## Consequences

### Positive

- Course generation finds a usable source for far more topics.
- The request limit, Laravel validation, and UI expose the same 2–20 range.
- YouTube quota cost per attempt does not change (one `search.list` call and one
  `videos.list` call regardless of playlist size).

### Negative

- Generated courses can contain up to 20 lessons, increasing model output
  tokens, latency, and per-course cost.
- More untrusted video metadata reaches the model in one request.

### Risks

- A 20-video course is longer than the earlier "short course" intent. Prompt
  guidance and the 800-character lesson limit still bound each lesson.
- Truncated model output would fail schema validation and return a safe error;
  the output token budget now scales with the playlist size.
- Search still returns many playlists above 20 videos, so some topics remain
  unsupported. This decision does not add paging or broader candidate scans.

## Alternatives Considered

1. **Keep 2–6 and scan more search candidates:** rejected because even the top
   50 results usually contained no playlist that small.
2. **Curate only topics known to have tiny playlists:** rejected as an
   operational workaround that does not improve the product.
3. **Accept any playlist and truncate to the first videos:** rejected because it
   breaks the approved rule that the complete ordered playlist becomes the
   course.

## Implementation Notes

- `ai-service` input schemas and the composed-course schema allow 2–20 videos.
- Laravel request validation accepts `max_videos` 2–20; the service still rejects
  a draft whose lesson count exceeds the requested maximum.
- The Contributor page offers 2–20 video counts.
- Benchmark and smoke requests use `max_videos: 20`; a pilot may run fewer than
  20 attempts without passing the benchmark gate.

## Validation

- Python tests cover the 20/21 boundary for input and composed output.
- Laravel feature test covers `max_videos: 20` accepted and 21 rejected.
- An isolated Compose smoke/pilot run creates and publishes a course whose
  lessons follow the verified playlist order.
