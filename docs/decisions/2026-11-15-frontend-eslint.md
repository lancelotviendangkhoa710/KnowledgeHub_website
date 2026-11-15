# Decision: Add ESLint to the frontend

**Status**: Approved
**Date**: 2026-11-15
**Author**: TEAM_MEMBER_A (UX-03), with Claude Code
**Related**: branch `p1/UX-03-frontend-eslint`; `frontend/package.json` already defines `"lint": "next lint"`

## Context

`npm run lint` is declared in `frontend/package.json` and in the UI redesign handoff checklist, but the project has no ESLint configuration or ESLint packages. `next lint` therefore stops at an interactive setup prompt, so lint cannot run locally, in Docker or in CI.

## Decision

Add ESLint as a development-only tool for the frontend:

- `eslint@^8.57.1` and `eslint-config-next@^14.2.35` in `devDependencies`. Version 8 is the line supported by Next.js 14; ESLint 9 is not used.
- `frontend/.eslintrc.json` extending `next/core-web-vitals` (Next's recommended preset, includes React hooks and accessibility-related rules). No custom rules.

No source code is changed. Existing findings are reported as warnings and are left for the owners of those files.

## Consequences

### Positive
- `npm run lint` works non-interactively; `next build` also lints, so new errors surface earlier.
- No runtime or bundle impact (dev dependencies only).

### Negative
- Larger `package-lock.json` (ESLint dependency tree).
- Two existing warnings are now visible: `<img>` in `courses/create/page.tsx` and a missing hook dependency in `learning/my-roadmaps/page.tsx`.

### Risks
- A future Next.js major upgrade needs a matching `eslint-config-next` and possibly ESLint 9. Mitigation: upgrade them together with Next.js.
- Any rule that later becomes an error could fail `next build`. Mitigation: warnings are fixed or explicitly disabled in the PR that introduces them.

## Alternatives Considered

1. **Biome / other linters**: not part of the Next.js default tooling; would add a second toolchain.
2. **Keep TypeScript only**: `tsc` does not catch hook or accessibility mistakes.

## Implementation Notes

- Files: `frontend/package.json`, `frontend/package-lock.json`, `frontend/.eslintrc.json`.

## Validation

- `cd frontend && npm ci && npm run lint`: 0 errors (2 existing warnings).
- `npm run build`: passes.
