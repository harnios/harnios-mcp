# Contract: `POST /api/messaging/test`

Sends one real test message (email or Telegram) through the same underlying logic as the `send_email`/`send_telegram_message` MCP tools (spec 017), and reports the outcome — including the real error, on failure — for display on the new owner-only test page (FR-002 through FR-007).

## Request

`Content-Type: application/json`, owner session required (`requireOwnerSession`, unchanged from every existing route).

Body is one of:

```json
{ "channel": "email", "to": "someone@example.com", "subject": "Test", "body": "Hello from the test page" }
```

```json
{ "channel": "telegram", "chatId": "123456789", "text": "Test message" }
```

`chatId` is optional — when omitted, the server's configured default (`TELEGRAM_CHAT_ID`) is used, exactly as the MCP tool already does when its `chatId` argument is omitted.

## Response

`200 OK` for any handled outcome — success or a business-logic failure (invalid input, missing config, rate limited, delivery failure). The HTTP status does not encode the outcome; the body does, mirroring how the MCP tools report failure inside a normal result rather than as a transport-level error:

```json
{ "channel": "email", "status": "success", "destination": "someone@example.com" }
```

```json
{
  "channel": "telegram",
  "status": "failure",
  "destination": "123456789",
  "errorCode": "unauthorized",
  "errorMessage": "Telegram rejected the request for chat \"123456789\": bot was blocked by the user"
}
```

`errorCode` is one of the existing `MessagingErrorCode` values (`invalid_recipient`, `invalid_message`, `missing_config`, `rate_limited`, `unauthorized`, `delivery_failed`) — no new codes are introduced. `errorMessage` is the same human-readable text the underlying config validation / rate limiter / `sendEmailToRecipient` / `sendTelegramMessage` already produce (FR-006) — not reworded or summarized by this route.

`400 Bad Request` — malformed request only (missing/unknown `channel`, missing required field for that channel): `{ "code": "invalid_request", "message": "..." }`. This is the one case that does not reach the send logic at all.

`401 Unauthorized` — no active owner session or bearer token, same shape `requireOwnerSession()` already returns everywhere else.

## Behavior notes

- Every call — success or failure, including `invalid_recipient`/`invalid_message` rejections — is written to the existing Send Attempt Record audit trail (`lib/messaging/auditLog.ts`) via the same `recordSendAttempt()` call the MCP tools already make (FR-008). This route does not write to storage directly.
- Rate limiting (`checkAndRecordSend()`) is shared with the MCP tools — a `rate_limited` outcome here means the owner has exhausted the same window the tools also draw from (spec Assumptions).
- Email sends exactly one recipient per call (the `to` field is a single string, not an array) — unlike the MCP tool's 1-50 batch, since this route exists to verify configuration, not to send bulk mail (spec Assumptions).
- `subject`/`body` (email) and `text` (Telegram, max 4096 chars) are validated with the exact same rules (`isValidEmailAddress`, `isValidMessageLength`) the MCP tools already use, before any config is read or send attempted.
