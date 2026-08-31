# Quickstart: Validate the Design System & App Shell

Manual validation guide (this repo has no automated test suite). Run against a `next dev`
instance in `frontend/` after implementation. Toggle theme via Chrome DevTools →
**Rendering → Emulate CSS prefers-color-scheme** (`light` and `dark`).

## Prerequisites

- MinIO/S3 stack running and configured (spec 001); owner credentials configured.
- `cd frontend && npm install && npm run dev`.
- An active owner session for the gated pages, plus a way to reach `/oauth/login` logged out.

## Scenario 1 — One coherent look, light and dark (US1, FR-001..FR-004, SC-001, SC-002)

1. Visit `/` and every top-level route (see the list in Scenario 4).
2. **Expect** in **light**: system-ui body font (not serif), consistent heading sizes, one accent
   color for links/primary buttons, consistent card/table/notice styling, a centered page column.
3. Switch DevTools to **dark**.
4. **Expect**: dark background, light text, visible borders, and — critically — native
   `<input>/<select>/<textarea>`, checkboxes, and scrollbars rendered dark (confirms
   `color-scheme`). No light-on-light or dark-on-dark region on any page.
5. `grep -rn "fontFamily" frontend/app/**/page.tsx` → **expect** no page-shell matches.

## Scenario 2 — Shared header & navigation (US2, FR-006, FR-007, SC-006)

1. Signed in, open `/tools`.
2. **Expect**: a header with the OS name + logo mark, nav links (Dashboard, Files, Tools,
   Schedules, Settings), "Tools" marked current (`aria-current="page"`, visually distinct), and a
   sign-out control.
3. Click each nav link → lands on the right section; the current item updates.
4. Click sign-out → returns to `/oauth/login` (same behavior as the old per-page button).
5. Open `/schedules/new` → **expect** the header **and** a "← back to schedules" link.

## Scenario 3 — Chromeless surfaces (FR-008, SC-006)

1. Log out. Open `/oauth/login`, `/oauth/authorize?...`, `/init`.
2. **Expect**: **no** shared app header on any of them.
3. Open `/files` → **expect** its own editor header (logo + OS name + sidebar toggle), restyled to
   match the new palette, **not** the standard nav header.
4. Open `/editor/somefile` → 308-redirects to `/files/somefile` (unchanged).

## Scenario 4 — Every route renders (US1)

Walk each, light + dark, no console errors, layout intact:
`/`, `/init`, `/oauth/login`, `/oauth/authorize?...` (+ `?error=...`), `/tools`,
`/tools/<name>/confirm?to=disabled`, `/tools/connections`, `/tools/connections/new`,
`/tools/connections/<id>/edit`, `/tools/connections/<id>/confirm?to=removed`,
`/settings/connected-apps`, `/settings/personal-access-tokens`, `/settings/test-messaging`,
`/schedules`, `/schedules/new`, `/schedules/<id>`, `/schedules/<id>/edit`,
`/schedules/<id>/confirm?to=removed`, `/files`, `/files/<file>`.

## Scenario 5 — No behavior change: forms (US3, FR-009, SC-003)

Submit each and confirm it posts the same fields to the same action:

- Sign-in (`/oauth/login`) — and confirm autofocus still lands on the username field.
- Sign-out (header).
- Tool enable/disable confirm (`/tools/<name>/confirm`).
- Connection create / edit / enable-disable / remove.
- Schedule create / edit / enable / run-now / remove.
- PAT create / revoke.
- Connected-app revoke.
- **OAuth consent approve** and **OAuth consent deny** (`/oauth/authorize`) — inspect the request
  payload and confirm `decision=approve` / `decision=deny` are still sent.
- First-run setup (`/init/submit`), including the language radio.

## Scenario 6 — No behavior change: routes & i18n (US3, FR-009, SC-004)

1. Every URL in Scenario 4 resolves to the same page as before — nothing moved.
2. Hit a gated page logged out → redirected to `/oauth/login?continue=<that path>`; after login,
   land back on it.
3. Cycle the language across all six (en/it/ru/fr/de/es): `<html lang>` matches; nav labels are
   localized; no missing-key crash. Dashboard still lists all seven destinations.

## Scenario 7 — `/files` editor still works (US3, FR-010)

In light and dark: expand the tree, open a markdown file (preview + edit toggle), open a CSV
(table + raw toggle), edit and save, trigger the external-change banner, toggle the mobile
sidebar (narrow viewport). All behave as before; colors follow the theme. CodeMirror itself
stays light in dark mode — a known, accepted v1 limitation.

## Scenario 8 — Build hygiene (SC-005)

- `cd frontend && npx tsc --noEmit` → clean.
- `git diff main -- frontend/package.json` → empty (no new dependency).
