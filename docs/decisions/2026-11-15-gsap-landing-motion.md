# Decision: Use GSAP for the landing page hero motion

**Status**: Approved
**Date**: 2026-11-15
**Author**: TEAM_MEMBER_A (UX-02 UI redesign), with Claude Code
**Related**: `docs/ui-redesign/TAI-LIEU-BAN-GIAO-GIAO-DIEN.md` §1, branch `p1/UX-02-ui-v2`

## Context

The approved mockup (`docs/ui-redesign/mockup/index.html`) has one deliberate motion moment: when the landing page (`/`) opens, the large ghost word slides in, the yellow disc rises and the hero text and preview card appear one after another. Everything else in the redesign uses plain CSS.

## Decision

Add the npm package `gsap` (3.x, frontend only) and use it for that single hero entrance on `/`.

- The code lives in one client component (`HeroMotion`) and loads GSAP with a dynamic `import()` inside an effect, so no other route downloads it.
- The motion is skipped entirely when `prefers-reduced-motion: reduce` is set.
- No other page uses GSAP. Lenis is not added by this decision.

## Consequences

### Positive
- Reproduces the mockup's entrance exactly with a few lines of code.
- Zero cost for pages other than `/` (separate chunk, loaded only on the landing page).

### Negative
- One more frontend dependency to keep updated.

### Risks
- GSAP's "standard no charge" licence differs from MIT. It is free for this use, but the licence text (https://gsap.com/standard-license) should be re-read if the product's business model changes.
- Content may flash visible for a moment before the animation starts (client-side only effect). Acceptable for a short entrance; revisit if it becomes noticeable.

## Alternatives Considered

1. **CSS animations only**: simple and dependency-free, but the staggered sequence is harder to keep identical to the mockup and the handoff document explicitly approves GSAP for this one moment.
2. **Framer Motion / other libraries**: heavier and not in the approved tool list.

## Implementation Notes

- Package: `gsap` in `frontend/package.json`.
- Component: `frontend/src/components/landing/HeroMotion.tsx`, used only by `frontend/src/app/(landing)/page.tsx`.

## Validation

- Open `/` with normal settings: the hero animates once on load.
- Turn on "reduce motion" in the OS: the hero appears with no animation.
- Open `/courses`: the network panel shows no GSAP chunk.
