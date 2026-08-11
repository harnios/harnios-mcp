# Contract: HTML email support additions

**Input**: [spec.md](../spec.md), [data-model.md](../data-model.md), [research.md](../research.md)

**Extends (additively)**: The existing `send_email` MCP tool contract (spec 017, `specs/017-mcp-email-telegram-tools/contracts/mcp-tools-messaging.md`) and the existing `POST /api/messaging/test` contract (spec 029, `specs/029-test-messaging-tools/contracts/messaging-test-contract.md`). No field is removed or renamed on either; one optional field is added to each. No new error code is introduced (research.md §1) — malformed HTML degrades gracefully rather than producing a new failure mode (FR-006).

## `send_email` (MCP tool) — updated input

- **Input**: `{ to: string[], subject: string, body: string, isHtml?: boolean }`
  - `isHtml` (**new**, FR-001): when `true`, `body` is treated as HTML and delivered so HTML-capable clients render it, with an automatically-derived plain-text alternative for clients that don't (FR-002, FR-003). When omitted or `false`, behavior is unchanged from spec 017 (FR-004).
- **Output**: Unchanged — `{ results: Array<{ to, status, errorCode?, errorMessage? }> }` (spec 017 contract).
- **Errors**: Unchanged set of error codes (spec 017 contract's table). No malformed-HTML-specific error exists — an invalid/unclosed tag still results in `status: "success"` if delivery otherwise succeeds (FR-006).

## `POST /api/messaging/test` (`channel: "email"`) — updated request

- **Request** (extends spec 029's contract):
  ```json
  { "channel": "email", "to": "someone@example.com", "subject": "Test", "body": "<h1>Hi</h1><p>This is <b>bold</b>.</p>", "isHtml": true }
  ```
  `isHtml` (**new**, FR-007): optional, defaults to `false` (existing plain-text behavior) when omitted — mirrors the tool's field exactly, since the route calls the same `sendEmailBatch()` (research.md §1).
- **Response**: Unchanged shape from spec 029's contract (`{ channel, status, destination, errorCode?, errorMessage? }`) — `isHtml` does not appear in the response; the outcome reporting doesn't distinguish format (research.md §5).

## Behavior notes

- `isHtml` absent/`false` on either entry point is byte-for-byte the pre-030 code path — no new branch is exercised (research.md §3, satisfying FR-004/SC-002).
- When `isHtml` is `true`, the underlying send always includes both an HTML part (the caller's `body` verbatim) and a plain-text part (derived via `html-to-text`, research.md §2) — a caller cannot request HTML-only delivery with no fallback; this is intentional (FR-003).
- No sanitization is applied to HTML `body` content in either entry point (spec.md Assumptions) — this is unchanged from how plain-text `body` content is already handled with no content restriction beyond existing length/validation rules.
