# Implementation Plan: Frontend Design System & App Shell

**Branch**: `034-design-system-and-app-shell` | **Date**: 2026-08-31 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/034-design-system-and-app-shell/spec.md`

## Summary

The `frontend/` app gets its first real styling layer: one `frontend/app/globals.css` holding
design tokens (CSS custom properties for color, spacing, typography, radius, shadow, container
widths) with a full light palette on `:root` and a full dark palette under
`@media (prefers-color-scheme: dark)`, plus a minimal reset and a set of component classes. A
small set of server-component primitives in a new `frontend/app/_ui/` (`Page`, `PageHeader`,
`Button`, `Field`, `Banner`, `StatusPill`, `BackLink`, `SiteHeader`) wrap those classes. The root
layout imports the stylesheet and mounts `<SiteHeader/>`, which reads the `x-pathname` request
header (already set by `middleware.ts`) to self-hide on chromeless paths (`/oauth`, `/init`,
`/files`, `/editor`) and to mark the active nav item, and shows a sign-out control only when
`hasActiveOwnerSession()` is true. All ~21 pages are migrated off inline styles onto the
primitives/classes. The `/files` editor's hardcoded colors are re-pointed to the tokens (its
bespoke header restyled to match); CodeMirror stays light for v1. A new `nav` dictionary section
is added to `types.ts` and all six locale files. No new dependency; no route moves; no form or
behavior change. See [research.md](./research.md) for the mechanism decisions and
[tasks.md](./tasks.md) for the per-page checklist.

## Technical Context

**Language/Version**: TypeScript, Next.js 16 (App Router), React 19, Node.js runtime — no new
runtime requirements.

**Primary Dependencies**: None new. Plain CSS (`globals.css`), server components, and `styled-jsx`
(ships with Next, already used in `app/files/*`) only. No Tailwind, no CSS-in-JS, no component
library, no icon library, no `next/font`.

**Storage**: None involved — presentational only.

**Testing**: This repo has no automated test framework (confirmed unchanged since spec 031/032/033).
Verification is manual, via [quickstart.md](./quickstart.md).

**Target Platform**: No change — works identically on Vercel serverless and a persistent
VPS/Coolify deployment.

**Project Type**: Web application (existing single Next.js app in `frontend/`) — no new top-level
project, no new deployable unit.

**Performance Goals**: N/A — one small stylesheet, no runtime cost. The root layout already
renders dynamically (session cookie + `resolveLanguage()` on every request); `SiteHeader`'s
`headers()` read adds no new constraint.

**Constraints**: FR-009 — no route path, form action/field set, i18n resolution, or auth gate may
change. FR-012 — no new `package.json` entry. Client components (`app/files/*`,
`init/EnvSetupHelper.tsx`, `settings/test-messaging/MessagingTestForm.tsx`,
`files/ExternalChangeBanner.tsx`) MUST NOT import a server-component primitive — they use the
shared CSS classes only.

**Scale/Scope**: ~30 files: 1 new stylesheet, 9 new `_ui/` files, 1 layout edit, 7 dictionary
files, ~21 page migrations, 6 `app/files/*` color re-points, 1 file deletion (`app/HomeLink.tsx`).

## Constitution Check

`.specify/memory/constitution.md` is still the unfilled template — no ratified principles, so no
project-specific gates apply. This plan follows the repository's observed conventions (single
Next.js app in `frontend/`, no new dependency, spec-driven change, manual verification). One
prior-spec assumption is deliberately superseded: spec 026's "no new visual design system" — the
user has explicitly requested one here.

## Project Structure

### New files

```
frontend/app/globals.css                     # tokens + reset + component classes
frontend/app/_ui/Page.tsx
frontend/app/_ui/PageHeader.tsx
frontend/app/_ui/Button.tsx
frontend/app/_ui/Field.tsx
frontend/app/_ui/Banner.tsx
frontend/app/_ui/StatusPill.tsx
frontend/app/_ui/BackLink.tsx
frontend/app/_ui/SiteHeader.tsx
frontend/app/_ui/nav.ts
specs/034-design-system-and-app-shell/{spec,plan,research,tasks,quickstart}.md
```

### Modified files

```
frontend/app/layout.tsx                       # import globals.css, mount <SiteHeader/>
frontend/lib/i18n/dictionaries/types.ts       # new `nav` section
frontend/lib/i18n/dictionaries/{en,it,ru,fr,de,es}.ts
frontend/app/**/page.tsx                       # ~21 pages, per Group A–F (tasks.md)
frontend/app/HomeLink.tsx                      # DELETED after Groups B/C
frontend/app/init/EnvSetupHelper.tsx          # classes only
frontend/app/init/LanguageConfirm.tsx
frontend/app/settings/test-messaging/MessagingTestForm.tsx   # classes only
frontend/app/files/{Header,EditorApp,FileEditor,FileTree,CsvTableEditor,ExternalChangeBanner}.tsx
```

## Key Decisions

1. **Primitives in `frontend/app/_ui/`** — `_`-prefixed = Next private folder, never routed; no
   tsconfig change; matches the repo's `app/`-colocated UI (`app/HomeLink.tsx`).
2. **App shell in the root layout, not a route group** — `middleware.ts` already sets
   `x-pathname` on every matched request. `SiteHeader` reads it via `headers()` for chromeless
   gating and active state. A `app/(app)/` route group would relocate ~19 `page.tsx` files (plus
   sibling `route.ts` handlers) for no benefit and would threaten the "no URL change" guarantee.
3. **Class layer + component layer** — pure-style elements are CSS classes (so `"use client"`
   files can use them); structural duplication (`Page`, `PageHeader`, `Button`, `Field`,
   `Banner`, `StatusPill`, `BackLink`) is thin server components wrapping those classes.
4. **`Button` polymorphism** — one component renders `<button>` (default `type="button"`) or
   `<a>` (`as="a"`), spreading `...rest` so `name`/`value`/`type`/`formAction`/`disabled`/
   `autoFocus` always reach the DOM.
5. **`HomeLink` retired** — top-level pages rely on the shell; sub-pages get `<BackLink>`.

## Complexity Tracking

No constitution violations. The change touches many files but adds no new architectural pattern,
service, project, or dependency — it centralizes styling that is currently duplicated inline.
