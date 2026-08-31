# Tasks: Frontend Design System & App Shell

**Input**: Design documents from `/specs/034-design-system-and-app-shell/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [quickstart.md](./quickstart.md)

**Tests**: Not included — this repo has no automated test framework (plan.md, Technical Context).
Verification is manual, via [quickstart.md](./quickstart.md).

## Format: `[ID] [P?] Description`

- **[P]**: can run in parallel (different files, no dependency on an incomplete task)
- File paths are exact and relative to the repo root.

---

## Phase 1: Foundation (tokens + primitives + shell + i18n)

Additive only — after this phase the app still renders; pages just gain a header and a stylesheet.

- [X] T001 Create `frontend/app/globals.css`: `:root` light tokens + `@media (prefers-color-scheme: dark)` dark tokens (surfaces/text/lines, accent, semantic fg+bg ×4, type scale, spacing scale, radius, shadow, `--w-xs/sm/md/lg` = 400/640/720/900, `--header-h`); `color-scheme` light→dark; minimal reset (box-sizing, body font/size/leading/color/bg, h1–h3, p, a, code/pre, table, form-control `font: inherit`, `:focus-visible`); component classes (`.page` + `--xs/sm/md/lg`, `.stack` / `.stack--sm`, `.cluster`, `.page-header` + `__row`, `.muted`, `.error-text`, `.card`, `.btn` + `--primary/secondary/danger/ghost`, `.field` + `__label/__hint` + `--inline`, `.input`, `.table`, `.banner` + `--info/success/warning/danger`, `.pill` + `--success/warning/danger/accent`, `.backlink`, `.site-header` + `__brand/__name/__signout`, `.site-nav` + `a[aria-current="page"]`, `.logo-mark`, `@media (max-width: 640px)` nav block).
- [X] T002 [P] Create `frontend/app/_ui/Page.tsx` — `<main className="page page--{size}">`, `size?: "xs"|"sm"|"md"|"lg"` default `md`, `className` + `style` + `children` passthrough. Server component.
- [X] T003 [P] Create `frontend/app/_ui/PageHeader.tsx` — `{ title, actions?, description? }` → `.page-header` (`h1` + optional `.cluster` actions + optional `.muted` description). Server component.
- [X] T004 [P] Create `frontend/app/_ui/Button.tsx` — polymorphic `<button>` (default `type="button"`) / `<a>` (`as="a"`), `variant?: "primary"|"secondary"|"danger"|"ghost"` default `primary`, spreads `...rest`. Server component.
- [X] T005 [P] Create `frontend/app/_ui/Field.tsx` — `{ label, hint?, htmlFor? }` wrapping `<label className="field">…{children}…</label>`. Server component.
- [X] T006 [P] Create `frontend/app/_ui/Banner.tsx` — `tone?: "info"|"success"|"warning"|"danger"` default `info`; `role="alert"` auto for warning/danger. Server component.
- [X] T007 [P] Create `frontend/app/_ui/StatusPill.tsx` — `tone?: "success"|"warning"|"danger"|"muted"|"accent"` default `muted`. Server component.
- [X] T008 [P] Create `frontend/app/_ui/BackLink.tsx` — `{ href, label }` → `<a className="backlink">← {label}</a>`. Server component.
- [X] T009 [P] Create `frontend/app/_ui/nav.ts` — `NAV_ITEMS` = Dashboard `/` (prefix `/`), Files `/files`, Tools `/tools`, Schedules `/schedules`, Settings `/settings/connected-apps` (prefix `/settings`); each `{ href, prefix, key }`.
- [X] T010 Create `frontend/app/_ui/SiteHeader.tsx` — async server component: read `x-pathname` from `headers()` (fallback `"/"`); `return null` if path matches `CHROMELESS = ["/oauth","/init","/files","/editor"]` (exact or `+"/"` prefix); else render `.site-header` with `.logo-mark` (`getOsName().charAt(0).toUpperCase()`) + name linking `/`, `<nav className="site-nav">` from `NAV_ITEMS` with `aria-current="page"` on prefix match (`/` matches only exact), and — only when `await hasActiveOwnerSession()` — `<form method="POST" action="/oauth/logout"><button type="submit" className="btn btn--ghost">{nav.signOut}</button></form>`. Strings from `getDictionary(await resolveLanguage()).nav`. (depends on T001, T009)
- [X] T011 Edit `frontend/app/layout.tsx` — add `import "./globals.css";` as the first import; render `<SiteHeader />` inside `<body>` before `{children}`. Leave `<html lang>` and `metadata` untouched. (depends on T010)
- [X] T012 Add `nav` section to `frontend/lib/i18n/dictionaries/types.ts`: `nav: { dashboard; files; tools; schedules; settings; signOut; menuLabel; home }` (all `string`).
- [X] T013 Add the `nav` block to `frontend/lib/i18n/dictionaries/{en,it,ru,fr,de,es}.ts` with real translations (see plan/research §9 for wording; reuse existing `"Sign out"` translation per locale for `signOut`).
- [X] T014 Run `cd frontend && npx tsc --noEmit` — clean. **→ checkpoint commit 1.**

---

## Phase 2: Group A — list / table pages

- [X] T020 [P] `frontend/app/page.tsx` — `<main>`→`<Page size="md">`; title/description→`<PageHeader>`; `<ul listStyle:none>` of `DASHBOARD_LINKS`→`.stack--sm` list, each row a `.card`-ish link. Keep `DASHBOARD_LINKS` and all seven hrefs.
- [X] T021 [P] `frontend/app/tools/page.tsx` — drop `cellStyle` + `HomeLink`; `<main>`→`<Page size="md">`; header row (h1 + logout form)→`<PageHeader title description>` (logout now in shell); `<table>`→`.table`; "changed" + `warningNotice` box→`<Banner tone="info">`; status cell→`<StatusPill tone={enabled?"success":"muted"}>`; toggle `<a>` kept.
- [X] T022 [P] `frontend/app/tools/connections/page.tsx` — drop `cellStyle` + `HomeLink`; `<main>`→`<Page size="lg">`; `<PageHeader>`; `<table>`→`.table`; collision box→`<Banner tone="danger">`; `errorCodeLabel` inline color→`.error-text`; status→`<StatusPill>`; action row→`.cluster`.
- [X] T023 [P] `frontend/app/settings/connected-apps/page.tsx` — drop `cellStyle` + `HomeLink`; `<Page size="md">`; `<PageHeader>` (drop per-page logout form/key usage); `.table`; status→`<StatusPill>`; revoke `<button type="submit">`→`className="btn btn--secondary"`.
- [X] T024 [P] `frontend/app/settings/personal-access-tokens/page.tsx` — same shell/table/HomeLink treatment; create-form `<form style={flex,gap}>`→`.cluster`, `<input style={flex:1}>`→`className="input"` (keep `style={{flex:1}}`); token-shown box→`<Banner tone="success">`; revoked status→`<StatusPill tone="muted">`.
- [X] T025 [P] `frontend/app/settings/test-messaging/page.tsx` — `<Page size="md">` + `<PageHeader>` + `<BackLink>` if it used `HomeLink`; the client `MessagingTestForm` is handled in T041.
- [X] T026 [P] `frontend/app/schedules/page.tsx` — drop `cellStyle` + `HomeLink`; `<Page size="lg">`; `<PageHeader>`; `.table`; status→`<StatusPill>`; row action forms/links→`.cluster` + `.btn btn--secondary`.
- [X] T027 [P] `frontend/app/schedules/[id]/page.tsx` — drop `cellStyle` + `HomeLink`; `<Page size="lg">`; `<PageHeader>`; history `<table>`→`.table`; `alreadyRunning` box→`<Banner tone="info">`; action row→`.cluster`.
- [X] T028 Run `npx tsc --noEmit`; visual check Group A light+dark. **→ commit.**

---

## Phase 3: Group B (confirm) + Group C (forms)

- [X] T030 [P] `frontend/app/tools/[name]/confirm/page.tsx` — `<Page size="sm">`; `<h1>`→`<PageHeader>`; error branch `<p>`→`<Banner tone="danger">`; `warningNotice`→`<Banner tone="warning">`; `<form style={flex,gap}>`→`.cluster` (keep `method`/`action`/hidden `name="to"`); submit→`<Button type="submit" variant={to==="disabled"?"danger":"primary"}>`; cancel `<a>`→`<Button as="a" href variant="ghost">`.
- [X] T031 [P] `frontend/app/tools/connections/[id]/confirm/page.tsx` — same shape; `variant="danger"` when the action is `removed`.
- [X] T032 [P] `frontend/app/schedules/[id]/confirm/page.tsx` — same shape; both the error branch and the success branch get `<Page size="sm">` + `<PageHeader>`; `removeWarning`→`<Banner tone="warning">`; submit `variant="danger"`.
- [X] T033 [P] `frontend/app/schedules/new/page.tsx` — `<Page size="sm">`; `HomeLink`→`<BackLink href="/schedules" label={dict.backLink}>`; `<h1>`→`<PageHeader>`; error→`<Banner tone="danger">`; `<form style={flexColumn,gap}>`→`.stack`; each label+input→`<Field><input className="input" …/></Field>` (keep `name`/`required`/`defaultValue`/`placeholder`/`rows`); checkbox row→`.field field--inline`; submit+back `<div>`→`.cluster` with `<Button type="submit">` + `<Button as="a" variant="ghost">`.
- [X] T034 [P] `frontend/app/schedules/[id]/edit/page.tsx` — same as T033 (edit title, `defaultValue`s preserved).
- [X] T035 [P] `frontend/app/tools/connections/new/page.tsx` — same form treatment; `<BackLink href="/tools/connections">`.
- [X] T036 [P] `frontend/app/tools/connections/[id]/edit/page.tsx` — same; the "not found" branch also→`<Page size="sm">` + `<PageHeader>` + `<Banner tone="danger">`.
- [X] T037 `grep -rl "HomeLink" frontend/app` → expect only remaining legit uses gone; **delete `frontend/app/HomeLink.tsx`** and remove its last imports.
- [X] T038 Run `npx tsc --noEmit`; visual check Groups B/C light+dark; submit one confirm form and one create form. **→ commit.**

---

## Phase 4: Group D (auth) + Group E (init) — chromeless

- [X] T040 [P] `frontend/app/oauth/login/page.tsx` — drop `PAGE_STYLE`/`INPUT_STYLE`; `<main>`→`<Page size="xs">`; `<h1>`+`<p>`→`<PageHeader title description>`; error `<p style={{color}}>`→`<Banner tone="danger">`; inputs→`<Field label><input className="input" id name type required autoFocus/></Field>` (hidden `continue` untouched); submit→`<Button type="submit">`.
- [X] T041 [P] `frontend/app/oauth/authorize/page.tsx` — `<Page size="xs">` + `<PageHeader>`; approve/deny `<button name="decision" value="…">`→`<Button type="submit" name="decision" value="approve">` / `value="deny" variant="secondary">` (**verify `name`/`value` in the DOM**); hidden inputs untouched; `ErrorPage` helper→`<Page size="xs">` + `<PageHeader>` + `<p>`.
- [X] T042 [P] `frontend/app/settings/test-messaging/MessagingTestForm.tsx` (`"use client"` — **classes only, no `_ui` import**) — `sectionStyle`→`className="card"`; `fieldStyle`→`className="input"`; `ResultBanner` conditional bg/color→`className={`banner banner--${isSuccess?"success":"danger"}`}`; `#666` hints→`className="muted"`; recent-attempts `<table>`→`.table` + drop inline cells. Keep the `language: string` prop + `getDictionary(language)` pattern.
- [X] T043 [P] `frontend/app/init/page.tsx` — drop `PAGE_STYLE`; each `<main>`→`<Page size="sm">`; h1+p groups→`<PageHeader>` where natural; keep `<form action="/init/submit">` and `<LanguageConfirm/>` as-is.
- [X] T044 [P] `frontend/app/init/EnvSetupHelper.tsx` (`"use client"` — **classes only**) — `INPUT_STYLE`→`className="input"`; `PRE_STYLE` bg→`var(--surface)`; `<div style={ERROR_BOX_STYLE}>`→`className="banner banner--danger"`.
- [X] T045 [P] `frontend/app/init/LanguageConfirm.tsx` — `border: "1px solid #ccc"`→`var(--border-strong)`; fieldset/option spacing to tokens.
- [X] T046 Run `npx tsc --noEmit`; visual check `/oauth/login`, `/oauth/authorize` (approve **and** deny), `/init`, `/settings/test-messaging` light+dark. Confirm the shell is absent on all of these. **→ commit.**

---

## Phase 5: Group F — `/files` reconciliation

- [X] T050 [P] `frontend/app/files/Header.tsx` (`<style jsx>`) — `#e5e5e5`→`var(--border)`, `#fff`→`var(--surface-raised)`, `#4f46e5`→`var(--accent)`, mark `#fff`→`var(--accent-fg)`, `#1a1a1a`→`var(--text)`, mobile `#ddd`→`var(--border-strong)`, `#333`→`var(--text)`; align sizing with the shared `.logo-mark` / `--header-h`.
- [X] T051 [P] `frontend/app/files/EditorApp.tsx` (`<style jsx>`) — `#ddd`→`var(--border)`, `#fff`→`var(--surface-raised)`, `box-shadow`→`var(--shadow-2)`, `top: 52px`→`var(--header-h)`, drop the local `font-family` (inherits from `body`).
- [X] T052 [P] `frontend/app/files/FileEditor.tsx` (inline) — `#888`→`var(--text-muted)` (×5), `crimson`→`var(--danger-fg)` (×2), `#ddd`→`var(--border)`, active toggle `#eee`→`var(--surface)` / `#fff`→`var(--surface-raised)`, `#b8860b`→`var(--warning-fg)`, `#2e7d32`→`var(--success-fg)`.
- [X] T053 [P] `frontend/app/files/FileTree.tsx` — `#666`/`#888`→`var(--text-muted)`, `#fff`→`var(--surface-raised)`, `#ddd`→`var(--border)`, `boxShadow`→`var(--shadow-2)`, `#c0392b`→`var(--danger-fg)`, `#222`→`var(--text)`, `crimson`→`var(--danger-fg)`.
- [X] T054 [P] `frontend/app/files/CsvTableEditor.tsx` — `#eee`→`var(--surface)`, `#ddd`/`#f0f0f0`→`var(--border)`, `#888`/`#666`→`var(--text-muted)`, `#b8860b`→`var(--warning-fg)`.
- [X] T055 [P] `frontend/app/files/ExternalChangeBanner.tsx` (`"use client"` — **classes only**) — drop `bannerStyle`/`buttonStyle`; `<div role="alert" className="banner banner--warning cluster">` + buttons `className="btn btn--ghost"`.
- [X] T056 (optional) `frontend/app/files/Icons.tsx` — leave the multi-hue semantic fills; optionally change the two neutral greys (`#888`, `#5b6b7a`) to `currentColor`.
- [X] T057 Run `npx tsc --noEmit`; exercise `/files` in light+dark: tree, open file, markdown preview/edit toggle, CSV table/raw toggle, save, external-change banner, mobile sidebar toggle. **→ commit.**

---

## Phase 6: Verification & polish

- [ ] T060 Full manual pass per [quickstart.md](./quickstart.md) — every route in light **and** dark; every form submits; every URL unchanged; six languages; native controls/scrollbars dark in dark mode.
- [X] T061 `grep -rn "fontFamily\|maxWidth: 720\|maxWidth: 900\|maxWidth: 640\|maxWidth: 360\|maxWidth: 420" frontend/app/**/page.tsx` → expect no page-shell matches (SC-001).
- [X] T062 `git diff main -- frontend/package.json` → empty (SC-005). `npx tsc --noEmit` clean.
- [ ] T063 Tick `tasks.md`, finalize `quickstart.md` results, open PR.

---

## Dependencies

- Phase 1 blocks everything (tokens/classes/primitives/shell must exist first). Within Phase 1:
  T001 + T009 → T010 → T011; T012 → T013 → T014.
- Phases 2–5 are independent of each other once Phase 1 lands; do them in order for reviewable
  commits. T037 (delete `HomeLink`) requires Groups A–C done (Phases 2–3).
- Phase 6 is last.

## Parallel example

After T014 (checkpoint commit 1), all of T020–T027 touch different files and can proceed in
parallel; same for T030–T036, T040–T045, T050–T055.
