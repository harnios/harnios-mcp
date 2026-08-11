# Phase 1 Data Model: Test Messaging Tools from the Web Interface

No new persisted entity is introduced. This feature adds one new in-memory (request/response and client-state) shape and reuses two existing persisted entities from spec 017 unchanged.

## Send Outcome (new, not persisted)

The JSON body of the new API route's response — the uniform shape the route normalizes both channels' internal results into before replying, regardless of the two channels' differently-shaped internal functions (research.md §2: `sendEmailBatch` returns a per-recipient array and throws for call-level failures; `sendTelegramTextMessage` returns a single discriminated result and never throws). Exists only for the duration of one request/response cycle and, on the client, in page state.

| Field | Type | Notes |
|---|---|---|
| `status` | `"success" \| "failure"` | Discriminant. |
| `errorCode` | `MessagingErrorCode` (present only when `status: "failure"`) | Reuses the existing enum from `lib/messaging/errors.ts` — `invalid_recipient`, `invalid_message`, `missing_config`, `rate_limited`, `unauthorized`, `delivery_failed`. No new codes. |
| `errorMessage` | `string` (present only when `status: "failure"`) | The human-readable message already produced by existing validation/config/send-layer code (e.g. the real SMTP/Telegram error text) — not reworded. |
| `destination` | `string` | Recipient email address or resolved Telegram chat ID (after defaulting), so the UI can label which send this outcome belongs to. |
| `channel` | `"email" \| "telegram"` | Set by the API route before returning; lets one response shape serve both channels. |

## Test Attempt (new, client-only, not persisted)

One entry in the page's "recent attempts" list (User Story 3). Held in React state in the browser; discarded on page reload/navigation away. Not a database/storage entity — listed here only because the spec's Key Entities section names it.

| Field | Type | Notes |
|---|---|---|
| `channel` | `"email" \| "telegram"` | |
| `destination` | `string` | |
| `timestamp` | `string` (ISO 8601) | Set client-side at the moment the response is received. |
| `outcome` | `SendOutcome` (above) | |

## Reused entities (spec 017, unchanged)

### Send Attempt Record (`lib/messaging/auditLog.ts`)

Already defined and already written to by `recordSendAttempt()`. This feature's shared send functions call the exact same function with the exact same shape — no field added, no schema change. Test-page-initiated sends are indistinguishable from MCP-tool-initiated sends in this record (by design, FR-008; see research.md §3).

### Rate Limit State (`lib/messaging/rateLimit.ts`)

Already defined and already enforced by `checkAndRecordSend()`. This feature's shared send functions call the exact same function; test sends consume the same shared quota as tool-initiated sends (research.md §3, spec Assumptions).

## Messaging Configuration (`lib/messaging/config.ts`)

Read-only for this feature — `readMessagingConfig()`/`validateEmailConfig()`/`validateTelegramConfig()` are called exactly as spec 017 already calls them. No new configuration fields.
