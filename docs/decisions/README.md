# Architecture Decision Records (ADRs)

Track important technical decisions affecting database design, data pipelines, and system architecture.

## Status Labels

- **Proposed**: Under consideration, not yet approved
- **Approved**: Accepted by team, ready for implementation
- **Implemented**: Completed and verified in repository
- **Superseded**: Replaced by newer decision (reference replacement)
- **Deprecated**: No longer recommended, but may exist in legacy code

## Format

Create files named `YYYY-MM-DD-short-title.md` with structure:

```markdown
# Decision: [Title]

**Status**: [Proposed|Approved|Implemented|Superseded|Deprecated]  
**Date**: YYYY-MM-DD  
**Author**: [Team member or AI agent]  
**Related**: [Link to related decisions, issues, or PRs]

## Context

What problem or requirement led to this decision?

## Decision

What was decided? Be specific about technology, pattern, or approach.

## Consequences

### Positive
- Benefit 1
- Benefit 2

### Negative
- Tradeoff 1
- Limitation 1

### Risks
- Risk 1 and mitigation strategy

## Alternatives Considered

1. **Option A**: Why rejected
2. **Option B**: Why rejected

## Implementation Notes

Technical details, migration path, or references to documentation.

## Validation

How to verify this decision was implemented correctly.
```

## Example Topics

- Database schema changes (normalization, denormalization)
- Constraint design (cascade rules, soft delete strategy)
- Pipeline architecture (batch vs. streaming, orchestration)
- Technology selection (libraries, frameworks, services)
- Performance optimization (indexing strategy, caching)

## Review Process

1. AI agent or developer creates ADR with **Proposed** status
2. Team reviews and discusses
3. Update to **Approved** when consensus reached
4. Implement with tests and documentation
5. Update to **Implemented** when merged

Keep decisions lightweight. Not every implementation detail needs an ADR.
