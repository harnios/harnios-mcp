# Quickstart: Send Email Messages in HTML

Validates the feature end-to-end against a local dev environment. Assumes the existing local setup (`docker compose` for local storage, `frontend/.env.local` configured with working SMTP credentials, owner login working) — same prerequisites as spec 029's quickstart.

## Prerequisites

```bash
docker compose up -d          # starts local storage backend (repo root)
cd frontend
npm install
npm run dev
```

Sign in as the owner at `http://localhost:3000/oauth/login`, then open the test page at `http://localhost:3000/settings/test-messaging` (spec 029).

## Scenario 1 — Send an HTML test email and see it render (User Story 1, User Story 3, FR-001, FR-002, FR-005, FR-007, SC-001)

1. On the test page's email form, check "Send as HTML".
2. Enter a recipient you can check, a subject, and a body containing simple markup, e.g. `<h2>Hello</h2><p>This is <b>bold</b> and this is a <a href="https://example.com">link</a>.</p>`.
3. Submit. **Expected**: success confirmation, same as any other test send. Check the recipient inbox: the heading, bold text, and clickable link render as formatted content, not raw tags (SC-001).

## Scenario 2 — Plain-text fallback for non-HTML clients (FR-003, SC-003, Edge Case)

1. Using the same HTML email from Scenario 1, inspect the raw received message source (most mail clients offer "view source"/"show original").
2. **Expected**: the message contains both a `text/plain` part and a `text/html` part (multipart/alternative). The plain-text part reads as sensible text (e.g. "Hello\n\nThis is bold and this is a link (https://example.com).") — not blank, not raw HTML tags.

## Scenario 3 — Malformed HTML still delivers (User Story 1 Acceptance Scenario 3, FR-006, Edge Case)

1. Check "Send as HTML" and submit a body with intentionally broken markup, e.g. `<p>Unclosed <b>bold and <i>italic</p>`.
2. **Expected**: the send still succeeds (no new error code, no rejected send) — the recipient sees a best-effort rendering rather than the send failing outright.

## Scenario 4 — Existing plain-text behavior is unchanged (User Story 2, FR-004, SC-002)

1. Leave "Send as HTML" unchecked and submit a plain body as before this feature existed.
2. **Expected**: identical behavior to spec 029's original quickstart Scenario 1 — no formatting artifacts, no unexpected markup interpretation.
3. Submit a plain body that happens to contain `<` or `>` characters (not intended as markup) with "Send as HTML" still unchecked.
4. **Expected**: those characters appear literally in the received email, exactly as they would have before this feature (Edge Case, User Story 2 Acceptance Scenario 2).

## Scenario 5 — MCP tool exposes the same capability (FR-001, FR-005)

1. Using a connected MCP client (or by re-running spec 017's own quickstart with a client), call `send_email` with `isHtml: true` and an HTML `body`.
2. **Expected**: same rendering result as Scenario 1 — the tool and the web test page produce identical delivered output for the same input, since both call the same shared send logic (research.md §1).
3. Call `send_email` without `isHtml` (as before this feature). **Expected**: unchanged from spec 017's original behavior.
