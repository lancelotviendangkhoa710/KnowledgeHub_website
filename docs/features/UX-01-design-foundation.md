# UX-01 — KnowledgeHub Design Foundation

**Status:** IMPLEMENTATION IN PROGRESS  
**Owner:** TEAM_MEMBER_A (initial frontend foundation)  
**Source:** Root `index.html` and `style.css`, migrated into Next.js  
**Branch:** `p1/UX-01-design-foundation-rules` (formerly `p1/UX-01-knowledgehub-design-foundation`)  

## Purpose

Establish one reusable visual direction for KnowledgeHub so feature screens do
not invent unrelated styles. The foundation uses the existing editorial design
source: warm paper background, charcoal typography, burgundy accent, restrained
borders, compact radii, and content-led spacing.

## Core Design Tokens & Rules (Background and Text Colors)

All screens across the platform (including Landing, Auth, Courses, Learning, AI Companion) must strictly adhere to the following Design Tokens and color rules:

### 1. Background Color Palette

| CSS Token | HEX / RGBA Value | Mandatory Purpose & Usage Context |
|---|---|---|
| `--color-off-white` | `#FAF7F5` | **Primary Canvas (Warm Paper Background)**: Global background for `body`, landing page, hero section, landing sections, and application layout containers. |
| `--color-white` | `#FFFFFF` | **Elevated Surface (Card / Form / Input Background)**: Content cards, form containers, input fields (`input`, `textarea`), modal dialogs, and dropdown menus. |
| `--color-primary-pale` | `#F3E5E5` | **Level 1 Accent Background (Pale)**: Prominent pill badges, subtle hover states, and active/selected card indicators. |
| `--color-primary-faint` | `#FBF0F0` | **Level 2 Accent Background (Faint)**: Highlighted feature cards (e.g., AI Learning Companion), information and success message banners. |
| `--color-charcoal` | `#242124` | **High-Contrast Surface Background**: Strictly reserved for the site footer (`.site-footer`). |
| `--color-primary` | `#8B0000` | **Primary Brand Background**: Call-to-action banners (`.cta-section`) and primary action buttons (`.btn--primary`). |

### 2. Typography Palette & Text Hierarchy

| CSS Token | HEX / RGBA Value | Mandatory Rules & Application |
|---|---|---|
| `--color-charcoal` | `#242124` | **Primary Text**: Headings (`h1`–`h4`), course/article titles, form field labels (`label`), and key body content. Guarantees WCAG contrast ratio > 13:1 on `#FAF7F5` and `#FFFFFF`. |
| `--color-gray` | `#706B6B` | **Secondary / Body Text**: Descriptive paragraphs (`p`, `desc`), metadata, sub-labels, and default navigation links. Guarantees WCAG 2.1 AA compliance (> 4.5:1). |
| `--color-gray-light` | `#9E9898` | **Tertiary / Muted Text**: Form placeholders, small sub-captions, and disabled UI states. |
| `--color-primary` | `#8B0000` | **Brand Accent Text**: Emphasized heading keywords (italic accents), active navigation links, uppercase eyebrow text, and the `Hub` logo wordmark. |
| `--color-primary-light` | `#B22222` | **Interactive Accent Text**: Link hover states and warning/light alert notices. |
| `--color-white` | `#FFFFFF` | **Inverted Text**: **Permitted strictly on dark or red backgrounds** (such as `.btn--primary`, `.cta-section`, or `.site-footer`). **Never use white or light-gray text on warm paper or white surfaces.** |

### 3. Typography & Font Families

- **Primary Sans-Serif (System & UI Font)**:  
  `--font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;`  
  Applied across the entire UI: controls, body prose, standard headings, buttons, and inputs.
- **Editorial Serif (Accent Font)**:  
  `--font-family-serif: Georgia, 'Times New Roman', serif;`  
  Reserved exclusively for italic accent words in hero headings (`.hero-heading__accent`) and editorial blockquotes.

### 4. Cross-Domain Theme & Contrast Invariants

1. **Mandatory Contrast Compliance**: Every text-bearing UI element must pass **WCAG 2.1 AA** standards (minimum 4.5:1 contrast for regular text; 3:1 for large or bold text).
2. **Elimination of Washed-Out Text Defects**:
   - Legacy dark mode styles (`--text-primary: #f8fafc`, `--text-secondary: #cbd5e1`, etc.) must never be rendered against light surfaces.
   - Feature screens across domains (Member B's `/courses` and Member C's `/learning/roadmaps`) sharing the application shell must inherit the light foundation palette (`--color-charcoal` on `--color-off-white` / `--color-white`).
3. **Isolation and Normalization of `shared-source.css`**: Legacy global variables from `shared-source.css` (`--bg-canvas: #090c13`, `--color-primary: #f59e0b`) must not overwrite or pollute the baseline foundation tokens defined in `landing-source.css`.

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
- **2026-11-03**: Updated foundation document with explicit background and text color rules, typography hierarchy, and cross-domain WCAG AA contrast invariants to prevent washed-out text conflicts across team members' domains. Translated all foundation specifications to English.
