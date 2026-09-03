# Quickstart: Root Dashboard Page

Validates the acceptance scenarios in [spec.md](./spec.md) end-to-end against a running dev server. No automated test suite exists in this repo (see plan.md Technical Context); this is the manual validation path.

## Prerequisites

- `frontend/` dependencies installed (`npm install` inside `frontend/`, if not already done)
- Storage env vars set (`S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_BUCKET`) so `middleware.ts` does not redirect every request to `/init`
- An owner session available for testing the authenticated-link scenarios (sign in via `/oauth/login` using existing repo credentials/setup)

## Run

```bash
cd frontend
npm run dev
```

## Validate — User Story 1 (dashboard renders with links)

**Note (added 2026-09-02, FR-008)**: the dashboard now requires an active owner session — sign in
via `/oauth/login` before steps 1–6 below, or you'll be redirected to login instead of seeing the
dashboard (that redirect is itself validated in step 7).

1. Signed in, with storage configured, open `http://localhost:3000/`.
   - **Expect**: a dashboard page renders — no 404, no error (FR-001, SC-003).
2. Confirm the page shows four distinct links, clearly labeled: Files, Tools, Settings › Connected Apps, Settings › Personal Access Tokens (FR-002, SC-002).
3. Confirm there is **no** link to `/editor`, `/init`, `/oauth/login`, `/oauth/authorize`, or any `/tools/*/confirm` path (FR-004).
4. Click each link in turn; each one navigates to and successfully loads its target page (FR-003, SC-001).

## Validate — User Story 3 (existing cross-cutting behaviors still hold)

5. Temporarily unset one required storage env var and restart the dev server. Navigate to `/`.
   - **Expect**: redirected to `/init`, exactly as any other route would be today (FR-005). Restore the env var afterward.
6. With storage configured and a confirmed language preference set for the visitor (per existing spec 015 language-resolution flow), reload `/`.
   - **Expect**: the dashboard's link labels and any surrounding text render in that language (FR-006).
7. Sign out, then navigate directly to a linked page such as `/tools` (not via the dashboard).
   - **Expect**: redirected to `/oauth/login?continue=/tools` (or the corresponding path) — each linked page still enforces its own access rules exactly as before this feature existed.

## Validate — Follow-up (2026-09-02, FR-008): dashboard itself requires a session

8. Sign out (or use a private/incognito window with no session), then navigate to `http://localhost:3000/`.
   - **Expect**: redirected to `/oauth/login?continue=%2F` — the link list itself never renders, not even briefly. This is what step 1 above depends on being signed in for.
9. Sign in from that login page.
   - **Expect**: landed back on `/`, dashboard renders normally as in step 1.

## Pass criteria

All nine steps above match their **Expect** outcome. If any step diverges, the corresponding functional requirement in spec.md has a regression.
