# UX-01 — KnowledgeHub Design Foundation

**Status:** IMPLEMENTATION IN PROGRESS
**Owner:** TEAM_MEMBER_A (initial frontend foundation)
**Source:** Root `index.html` and `style.css`, migrated into Next.js
**Branch:** `p1/UX-01-knowledgehub-design-foundation`

## Purpose

Establish one reusable visual direction for KnowledgeHub so feature screens do
not invent unrelated styles. The foundation uses the existing editorial design
source: warm paper background, charcoal typography, burgundy accent, restrained
borders, compact radii, and content-led spacing.

## Migration rules

- Next.js owns the rendered application; root `index.html` remains the source
  markup reference while its approved `style.css` remains the visual source.
- `frontend/src/app/landing-source.css` is an exact copy of root `style.css`,
  because Docker builds the frontend from `frontend/` and cannot resolve files
  outside that build context.
- `frontend/src/app/shared-source.css` preserves the pre-existing application
  shell and course selectors used by non-landing routes; it is kept separate so
  the approved landing source can remain an exact copy.
- The landing route uses that source stylesheet directly so the Next.js render
  does not drift from the approved landing page. Feature-specific additions
  live under `frontend/`.
- Shared shell, typography, buttons, cards, forms, and responsive behavior are
  defined centrally before feature pages adopt them.
- A feature may add domain-specific UI, but must reuse the foundation tokens and
  primitives unless a new decision is recorded here.

## Approved scope

- Migrate the landing-page visual language into `frontend/src/app/globals.css`.
- Convert the landing page to a Next.js route.
- Keep authentication behavior and API contracts out of this UX branch.
- Apply the same foundation to AUTH-01 screens after this branch is reviewed.

## Explicitly deferred

- New illustration assets and animation system.
- Full component-library extraction.
- Redesign of course/content behavior or API responses.
- Changes to backend, database, or authentication rules.

## Change notes

- The pre-existing frontend migration was recovered from the local stash.
- The landing route now preserves the source page structure, knowledge graph,
  copy, class names, and stylesheet instead of recreating the visual design.
- When root `style.css` changes, update the frontend copy together and verify
  both files have the same hash before committing.
- The landing route is isolated from application/auth route groups; those groups
  render the existing shared header, main wrapper, and footer without duplicating
  the landing page shell.
- Shared application selectors remain available after the UX migration; this
  follow-up restores them from `origin/dev` rather than redesigning those routes.
- Auth forms add only the minimum form styles needed to use the same source
  tokens; their behavior remains outside this UX branch.
