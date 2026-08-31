# Feature Specification: Frontend Design System & App Shell

**Feature Branch**: `034-design-system-and-app-shell`

**Created**: 2026-08-31

**Status**: Draft

**Input**: User request: "vorrei sistemare design della app, adesso non c'è nulla" — the frontend
has no styling layer at all (no `globals.css`, no tokens, no fonts, no dark mode); every page
renders on browser defaults with copy-pasted inline `style={{…}}` objects and ad-hoc hex colors,
and there is no site-wide navigation. Establish a real, coherent design system and a persistent
app shell.

## Clarifications

### Session 2026-08-31

- Q: How far should the redesign go? → A: Full system + app shell — design tokens + reusable
  primitives + a shared header/nav on every top-level page.
- Q: Technical approach, given the repo deliberately avoids new dependencies? → A: Plain CSS only.
  One `app/globals.css` with CSS custom properties as tokens, plus a handful of server-component
  primitives. No Tailwind, no CSS-in-JS. `styled-jsx` (ships with Next) only where already used.
- Q: Light/dark theme? → A: Yes, automatic via `@media (prefers-color-scheme: dark)`. No manual
  toggle (consistent with the "no language switcher" decision from spec 015).
- Q: How much migration now? → A: All ~21 pages converted to the new tokens/primitives in this
  same effort.
- Q: Create the formal spec folder first, or implement straight from the plan? → A: Create
  `specs/034-…` first, following the convention of every prior feature.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Every page shares one coherent look (Priority: P1)

Today each page re-declares its own font, width, colors, and spacing inline, so the product looks
unfinished and inconsistent. After this change, every top-level page draws from one set of design
tokens (color, spacing, typography, radius, shadow) and a small set of shared UI primitives, so
the whole app reads as one designed surface in both light and dark mode.

**Why this priority**: This is the core of the request ("adesso non c'è nulla"). Without it there
is no design system.

**Independent Test**: Open every route in light and dark mode; confirm consistent typography,
spacing, colors, form controls, and table styling throughout, with no page still rendering on raw
browser defaults (serif body text, default blue links).

**Acceptance Scenarios**:

1. **Given** the design system is in place, **When** any top-level page is opened, **Then** it
   uses the shared page shell, typography, and color tokens — no page-local `fontFamily` or
   `maxWidth` inline style remains.
2. **Given** the viewer's OS is set to dark mode, **When** any page is opened, **Then** its
   background, text, borders, form controls, and scrollbars are dark-themed and legible, with no
   light-on-light or dark-on-dark regions.
3. **Given** a page shows a table, a status, a form, or a notice, **When** it renders, **Then**
   those use the shared `.table` / `StatusPill` / `Field` / `Banner` primitives rather than
   bespoke inline styles.

---

### User Story 2 - A persistent way to navigate the app (Priority: P1)

Today the only cross-page navigation is a per-page "← back to dashboard" link; there is no header,
and sign-out exists on only some pages. After this change, every top-level page carries a shared
header with the product name, primary navigation (Dashboard, Files, Tools, Schedules, Settings),
the active section highlighted, and a sign-out control when signed in.

**Why this priority**: A design system without navigation still leaves the app feeling like
disconnected pages. The shell is half of "full system + app shell".

**Independent Test**: From any top-level page, use the header to reach every primary section;
confirm the current section is visibly marked; confirm sign-out appears only when signed in and
works.

**Acceptance Scenarios**:

1. **Given** a signed-in owner on any top-level page, **When** the page renders, **Then** the
   shared header shows the product name, the primary nav links, and a sign-out control.
2. **Given** the owner is on a page under `/tools`, **When** the header renders, **Then** the
   "Tools" nav item is marked as current.
3. **Given** a logged-out visitor on the dashboard `/`, **When** the page renders, **Then** the
   header shows navigation but **no** sign-out control.
4. **Given** the viewer is on `/oauth/login`, `/init`, or the `/files` editor, **When** the page
   renders, **Then** the standard app header is **not** shown (these surfaces stay chromeless;
   `/files` keeps its own editor header).

---

### User Story 3 - Nothing else changes (Priority: P1)

The redesign is purely presentational. Every form still submits to the same handler, every URL is
unchanged, i18n still resolves the same way, and the `/files` editor still works exactly as
before.

**Why this priority**: A visual refactor that breaks a form submission or a route is a
regression, not an improvement.

**Independent Test**: Submit every form in the app (sign-in, sign-out, tool toggle, connection
create/edit/enable/remove, schedule create/edit/enable/run/remove, PAT create/revoke,
connected-app revoke, OAuth approve **and** deny, first-run setup); confirm each still posts to
its existing endpoint with the same fields. Confirm every route still resolves at its current
path. Cycle the language through all six and confirm labels localize and `<html lang>` is
correct.

**Acceptance Scenarios**:

1. **Given** any form in the app, **When** it is submitted after the redesign, **Then** it posts
   the same field names and values to the same action as before (in particular the OAuth consent
   screen's `decision=approve` / `decision=deny`, and the login form's autofocus).
2. **Given** any bookmarked or linked URL, **When** it is opened, **Then** it resolves to the
   same page as before — no path moved.
3. **Given** the `/files` editor, **When** it is used (tree, open file, markdown/CSV toggle, save,
   external-change banner, mobile sidebar), **Then** every interaction works as before, now
   theme-aware.

---

### Edge Cases

- Logged-out visitor to `/` — header renders without a sign-out control.
- A chromeless surface (`/oauth/*`, `/init`, `/files`, `/editor`) — the shared header must not
  appear; `/files` retains its own bespoke editor header.
- A viewer with no `prefers-color-scheme` preference — defaults to the light palette.
- A client component (the first-run env helper, the messaging test form, the editor) cannot
  import a server-component primitive — it must still pick up the design via shared CSS classes.
- The CodeMirror editor inside `/files` — remains its default light theme even in dark mode for
  this version (see Assumptions).
- A form primitive must not drop `name`, `value`, `type="submit"`, `formAction`, `disabled`, or
  `autoFocus` when it wraps a native control.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The app MUST define a single set of design tokens (color roles, spacing scale, type
  scale, radius, shadow, container widths) in one stylesheet loaded once for the whole app.
- **FR-002**: The tokens MUST provide a complete light palette and a complete dark palette, with
  the dark palette applied automatically from the viewer's `prefers-color-scheme`. No manual
  theme switcher is introduced.
- **FR-003**: Native form controls and scrollbars MUST follow the active theme (light or dark).
- **FR-004**: Every top-level page MUST render its shell, typography, spacing, and colors from the
  shared tokens/primitives — no page may keep a page-local `fontFamily`, `maxWidth`/`margin`
  page-shell inline style, or ad-hoc hex color.
- **FR-005**: The app MUST provide reusable UI primitives covering at least: page shell, page
  header, button (usable as `<button>` and as `<a>`), form field, banner/callout, status pill,
  and back-link. Purely stylistic elements (table, card, input, layout row/stack) MUST also be
  expressible as shared CSS classes so client components can use them without importing a
  server component.
- **FR-006**: A shared app header MUST appear on every top-level page, showing the product name,
  primary navigation, and a sign-out control **only** when a signed-in owner session exists.
- **FR-007**: The shared header MUST mark the navigation entry matching the current path as
  current.
- **FR-008**: The shared header MUST NOT appear on `/oauth/*`, `/init`, `/files`, or `/editor`.
  The `/files` editor keeps its own header, restyled to match the shared design.
- **FR-009**: The redesign MUST NOT change any route path, any form's action or field set, the
  i18n resolution behavior, or any authentication/authorization gate.
- **FR-010**: The `/files` editor's colors MUST be re-pointed to the shared tokens so it is
  theme-aware, without rewriting the CodeMirror editor component.
- **FR-011**: All new user-facing strings (navigation labels, sign-out, aria labels) MUST be
  added to the typed dictionary and translated in all six supported languages.
- **FR-012**: The change MUST add no new runtime or build dependency.

### Key Entities

- **Design token**: A named CSS custom property (e.g. `--accent`, `--space-4`, `--text-lg`)
  defined once for light and once for dark, referenced everywhere instead of literal values.
- **UI primitive**: A small shared server component (`Page`, `PageHeader`, `Button`, `Field`,
  `Banner`, `StatusPill`, `BackLink`, `SiteHeader`) or shared CSS class (`.table`, `.card`,
  `.input`, `.cluster`, `.stack`, `.btn`, `.banner`, `.pill`) that wraps the tokens into a
  reusable unit.
- **App shell**: The shared `SiteHeader` rendered by the root layout, self-hiding on chromeless
  paths, deriving active state and sign-out visibility from request context.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Zero top-level pages retain a page-local `fontFamily` or page-shell `maxWidth`
  inline style after the migration (`grep` shows none).
- **SC-002**: Every route renders correctly in both light and dark mode — no unreadable region.
- **SC-003**: Every form in the app still submits successfully to its existing endpoint with an
  unchanged field set.
- **SC-004**: Every route resolves at exactly the same path as before; `?continue=` redirects
  still land correctly.
- **SC-005**: `npx tsc --noEmit` is clean; no new entry in `package.json` dependencies.
- **SC-006**: The shared header appears on all top-level pages and is absent on `/oauth/*`,
  `/init`, `/files`, `/editor`.

## Assumptions

- "No new visual design system beyond what the product uses" (spec 026) is superseded here: the
  user has explicitly asked for one. This feature establishes it; future features follow it.
- Container widths are consolidated to four steps (`xs 400 / sm 640 / md 720 / lg 900`). The
  three common existing widths (640/720/900) are preserved exactly; only `/oauth/login` (360) and
  `/oauth/authorize` (420) shift to 400. This is intentional, not a regression.
- The CodeMirror editor in `/files` keeps its default light theme in dark mode for v1.
  `@codemirror/theme-one-dark` is already a dependency, so a later `prefers-color-scheme`-driven
  editor theme needs no new dependency; it is out of scope here because it touches editor
  internals.
- The pre-existing untranslated `schedules.*` dictionary values (English in all locales, from
  spec 032) are out of scope; only the new `nav.*` strings are fully translated.
- Three now-unused `*.signOut` dictionary keys (`tools.signOut`,
  `settings.connectedApps.signOut`, `settings.messagingTest.signOut`) are left in place rather
  than removed, to avoid re-touching all six locale files for no user-visible benefit.
- Single Next.js app in `frontend/`; no new project or deployable unit.
