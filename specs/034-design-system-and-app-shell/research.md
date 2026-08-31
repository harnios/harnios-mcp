# Research: Frontend Design System & App Shell

## §1 — Styling mechanism: plain CSS + custom properties

**Decision**: One `frontend/app/globals.css` with CSS custom properties as design tokens, a
minimal reset, and component classes. Imported once at the top of `app/layout.tsx`.

**Rationale**: The repo has repeatedly and explicitly chosen "no new dependency" (plans 024, 026,
031, 032, 033 all state "None new"). Tailwind or any CSS-in-JS library adds a toolchain and a
`package.json` entry. CSS custom properties give theming (light/dark via one media query) and a
single source of truth with zero build cost. `styled-jsx` already ships with Next and is already
used in `app/files/*`; `var(--x)` resolves inside its blocks with no import.

**Alternatives rejected**: Tailwind (new dep + config, against repo norm); a TypeScript tokens
module consumed by inline styles (keeps the inline-style sprawl, no theming, no dark mode without
JS).

## §2 — Dark mode: automatic, no toggle

**Decision**: Full dark palette under `@media (prefers-color-scheme: dark)`, with
`color-scheme: light` on `:root` flipped to `dark` in the media query.

**Rationale**: `color-scheme` is what makes native `<input>/<select>/<textarea>`, checkboxes, and
scrollbars theme themselves — without it, dark mode has light-on-dark form controls. A manual
toggle would need a persisted per-viewer preference and client JS; spec 015 already set the
precedent of "no switcher" for language. Automatic is the least code and matches OS intent.

**Alternatives rejected**: manual toggle with `localStorage` + a `data-theme` attribute
(more code, a new persisted preference, flash-of-unstyled-content risk on hydration); light-only
(explicitly not what the user asked for).

## §3 — App-shell mechanism: `SiteHeader` in the root layout, gated by `x-pathname`

**Decision**: Render `<SiteHeader/>` in `frontend/app/layout.tsx`. `SiteHeader` is an async
server component that reads the `x-pathname` request header and returns `null` when the path is
under `/oauth`, `/init`, `/files`, or `/editor`; otherwise it renders the brand, the nav (active
item from the same `x-pathname`), and — only when `hasActiveOwnerSession()` — a sign-out form.

**Rationale**: `frontend/middleware.ts` **already** sets `x-pathname` on every matched request
(it was added in spec 018 for `app/files/layout.tsx`). So the pathname is available to any server
component via `next/headers` with no new plumbing. The root layout is already dynamic (every page
reads the session cookie; `resolveLanguage()` reads headers), so `headers()` in the layout adds
no rendering-mode constraint. Active-nav state is therefore feasible in v1 with no client
component.

**Alternatives rejected**: A `app/(app)/` route group with its own `layout.tsx` — would require
`git mv` of ~19 `page.tsx` files and their sibling `route.ts` handlers into the group, enlarging
the diff enormously, churning `git blame`, and risking a mis-nested route handler; route groups
don't change URLs but the move is disproportionate. A client `<SiteHeader>` using `usePathname()`
— needs `"use client"` at the top of the tree and can't call `hasActiveOwnerSession()` directly.

## §4 — Chromeless surfaces

**Decision**: `CHROMELESS = ["/oauth", "/init", "/files", "/editor"]`, matched as exact or
`startsWith(prefix + "/")`.

**Rationale**: `/oauth/login` and `/oauth/authorize` are pre-auth and deliberately minimal
(spec 014 stripped `/init` to a single button); `/init` is first-run setup; `/files` has its own
persistent editor header (`app/files/Header.tsx`) with a sidebar toggle the standard header
doesn't have; `/editor/*` is a pure 308 redirect with no UI. `/api` and `/mcp` never render the
app layout.

## §5 — Primitive vs class split

**Decision**: Server components for `Page`, `PageHeader`, `Button`, `Field`, `Banner`,
`StatusPill`, `BackLink`, `SiteHeader`. Plain CSS classes for `.table`, `.card`, `.input`,
`.cluster`, `.stack`, `.btn`, `.banner`, `.pill`, `.page`, `.field`.

**Rationale**: A `"use client"` file cannot import a server component. Four client files need the
new look (`app/files/*`, `init/EnvSetupHelper.tsx`, `settings/test-messaging/MessagingTestForm.tsx`,
`files/ExternalChangeBanner.tsx`). Making every primitive *also* a bare class means those files
opt in with `className="banner banner--danger"` etc. The server components exist only to remove
real structural repetition (the page shell, the header row, the label+input pair) and are thin
wrappers over the same classes.

## §6 — `Button` must not swallow form attributes

**Decision**: `Button` spreads `...rest` onto the underlying element and defaults `type="button"`;
callers that submit pass `type="submit"` explicitly.

**Rationale**: Two canary cases: `/oauth/authorize` has two submit buttons distinguished only by
`name="decision" value="approve|deny"` — if the component drops `name`/`value`, consent breaks
silently. `/oauth/login` relies on `autoFocus` on the username field. A typeless `<button>` in a
`<form>` submits, so defaulting to `type="button"` prevents an `as="a"`-less cancel button from
accidentally submitting.

## §7 — Container-width consolidation

**Decision**: `--w-xs: 400 / --w-sm: 640 / --w-md: 720 / --w-lg: 900`.

**Rationale**: Existing widths are 360, 420, 640, 720, 900. Keeping 640/720/900 exact avoids
visible reflow on the bulk of pages. 360 and 420 (login, OAuth authorize) both map to 400 — a
≤40px shift on two pre-auth pages, acceptable and simpler than carrying five tokens.

## §8 — `/files` reconciliation, not rewrite

**Decision**: Swap the hardcoded hex in `app/files/*` for `var(--token)`; restyle
`app/files/Header.tsx` to match the shared header family but keep it bespoke (it owns the mobile
sidebar toggle and lives inside the persistent client layout). Do not touch CodeMirror,
`MarkdownEditor`, or `PlainTextEditor`.

**Rationale**: The editor is the one already-designed surface; a full rewrite is out of scope and
risky. CodeMirror's theme is an editor-internal concern; `@codemirror/theme-one-dark` is already
a dependency so a future `prefers-color-scheme` editor theme needs nothing new.

## §9 — i18n additions

**Decision**: New top-level `nav` section in the `Dictionary` interface, translated in all six
locales. Reuse the existing `"Sign out"` wording for `nav.signOut`; leave the three now-unused
per-page `*.signOut` keys in place.

**Rationale**: Nav labels are the most visible strings in the app, so real translations are worth
the few minutes. Deleting the dead keys would re-touch all six files for no user benefit and risk
a type mismatch mid-migration.
