# Decision: UX-04 design tokens, Vietnamese UI font and accessible text colours

**Status**: Proposed
**Date**: 2026-11-14
**Author**: TEAM_MEMBER_B (Khua), drafted with an AI agent
**Related**: `docs/features/UX-01-design-foundation.md`, PR for branch `p2/UX-04-design-tokens`

## Context

UX-01 fixed the palette (warm paper `#FAF7F5`, charcoal `#242124`, burgundy `#8B0000`) and put its tokens in `frontend/src/app/globals.css`. A review of `dev` on 2026-11-14 found that feature code mostly bypasses them:

- 355 hard-coded hex values (89 distinct colours, including a Tailwind slate set and three different greens) and 742 inline `style={{…}}` blocks.
- 72 distinct font-size values with no shared scale.
- Fonts: `shared-source.css` loads Outfit, Plus Jakarta Sans and JetBrains Mono from Google Fonts with `@import`, but `globals.css` renders almost everything in the OS font (Segoe UI on Windows, something else on macOS and phones). Outfit has no Vietnamese glyphs (`next/font` data: subsets `latin`, `latin-ext`), while lesson titles and bodies are Vietnamese.
- `--color-gray-light` `#9E9898` is used for text but reaches only 2.7:1 on the canvas (WCAG AA needs 4.5:1).
- `<html lang="en">` while the content is Vietnamese.

## Decision

1. Keep the UX-01 brand colours. Add semantic tokens and use them instead of hex values in feature code:
   `--bg-subtle #F5EFEC`, `--border-strong #DCCFCB`, `--color-success #1B6E34`, `--color-warning #8A5A00`, `--color-info #1A6B85`, `--color-danger #B3261E`, each with a `*-bg` tint. All text pairs are ≥ 4.5:1 on white and on the canvas.
2. Darken secondary text: `--color-gray` `#706B6B → #6B6466` (5.4:1), `--color-gray-light` `#9E9898 → #767071` (4.5:1).
3. One UI font with full Vietnamese support, **Be Vietnam Pro** (400/500/600/700), plus **JetBrains Mono** for code, both self-hosted through `next/font/google` in `app/layout.tsx` (no new dependency; Next.js 14 ships it). `--font-family`, `--font-body` and `--font-display` all point to it. Remove the Google Fonts `@import`. The Georgia serif accent from UX-01 stays.
4. Reuse the existing scales in `landing-source.css` (`--text-*`, `--space-*`) and `shared-source.css` (`--radius-sm/md/lg`) rather than inventing new ones; add `--text-read` (17px), `--leading-read` (1.75) and `--measure-read` (70ch) for lesson pages.
5. One global `:focus-visible` outline in the brand colour.
6. `<html lang="vi">`. The UI copy language (English or Vietnamese) is a separate decision and is not changed here.

Feature pages then migrate to the tokens one domain at a time (UX-05 app shell, UX-06 course list, UX-07 course reader, UX-08 studio and admin for Content; Identity and AI pages by their owners).

## Consequences

### Positive
- Same rendering on Windows, macOS and phones; correct Vietnamese diacritics everywhere.
- Fonts are served from our own origin (no third-party request, no layout shift from `@import`).
- Muted text passes WCAG AA; status colours are consistent across domains.

### Negative
- Changes the look of every page slightly (font, gray tone); screenshots in docs become outdated.
- `docs/features/UX-01-design-foundation.md` (owned by TEAM_MEMBER_A) lists the system font stack and `#9E9898`; it needs a follow-up edit by its owner once this is approved.
- `next/font/google` downloads the font files at build time, so the build machine needs access to Google Fonts (Vercel and the Docker dev image do).

## Alternatives considered

- Keep the system font stack: zero cost, but inconsistent across platforms and the reason the current look varies.
- Plus Jakarta Sans (already declared): supports Vietnamese too, but its diacritics sit tighter at small sizes; Be Vietnam Pro was designed for Vietnamese.
- Adopt Tailwind/shadcn to reuse community components: a technology change for the whole team; rejected for now.
