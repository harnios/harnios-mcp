# Quickstart: Test Messaging Tools from the Web Interface

Validates the feature end-to-end against a local dev environment. Assumes the existing local setup from the repo README (`docker compose` for local storage, `frontend/.env.local` configured, owner login working) plus valid SMTP and Telegram bot credentials for a real (or disposable test) inbox/chat you control.

## Prerequisites

```bash
docker compose up -d          # starts local storage backend (repo root)
cd frontend
npm install
npm run dev                   # http://localhost:3000
```

Ensure `frontend/.env.local` has working `SMTP_HOST`/`SMTP_PORT`/`SMTP_USER`/`SMTP_PASSWORD`/`SMTP_FROM` and `TELEGRAM_BOT_TOKEN` (plus optionally `TELEGRAM_CHAT_ID`) — reuse whatever spec 017's own quickstart used to validate the MCP tools originally.

Sign in as the owner at `http://localhost:3000/oauth/login`, then open the new test page at `http://localhost:3000/settings/test-messaging`.

## Scenario 1 — Successful test email (User Story 1, FR-002, FR-005, SC-001)

1. In the email form, enter a recipient address you can actually check, a subject, and a body.
2. Submit. **Expected**: within a few seconds, a success confirmation appears naming the recipient (SC-001); the email arrives in the target inbox.
3. Check the "recent attempts" list. **Expected**: the attempt appears at the top, marked success.

## Scenario 2 — Failed test email shows the real error (User Story 1, FR-006, SC-002)

1. Enter a recipient address your SMTP account will reject (e.g. a malformed-but-plausible address the server itself rejects, or a domain your account isn't authorized to send to, if applicable), plus subject/body.
2. Submit. **Expected**: a failure state appears showing the actual error code/message the SMTP layer returned (not a generic "failed to send") — you can identify the cause from the page alone (SC-002).

## Scenario 3 — Missing email configuration (FR-007, Edge Cases)

1. Temporarily unset one required SMTP env var (e.g. `SMTP_PASSWORD`) and restart the dev server.
2. Submit a test email. **Expected**: a failure state names the missing configuration (e.g. "Missing required email configuration: SMTP_PASSWORD") without attempting a send. Restore the env var afterward.

## Scenario 4 — Successful test Telegram message (User Story 2, FR-003, FR-005, SC-001)

1. In the Telegram form, enter a chat ID your configured bot is a member of (or leave it blank to use the configured default, if set), plus message text.
2. Submit. **Expected**: within a few seconds, a success confirmation appears naming the chat; the message arrives in the target chat.

## Scenario 5 — Failed test Telegram message shows the real error (User Story 2, FR-006, SC-002)

1. Enter a chat ID the bot cannot reach (e.g. an ID the bot was never added to, or `0`).
2. Submit. **Expected**: a failure state shows the actual Telegram Bot API error description (e.g. "bot was blocked by the user" / "chat not found"), not a generic message.

## Scenario 6 — Default chat ID (User Story 2, Acceptance Scenario 4)

1. With `TELEGRAM_CHAT_ID` configured, leave the chat ID field blank and submit a message.
2. **Expected**: the message is sent to the configured default chat; the confirmation names that chat's ID.

## Scenario 7 — Missing Telegram configuration (FR-007, Edge Cases)

1. Temporarily unset `TELEGRAM_BOT_TOKEN` and restart the dev server.
2. Submit a test Telegram message. **Expected**: a failure state names the missing configuration without attempting a send. Restore the env var afterward.

## Scenario 8 — Validation before send (Edge Cases, FR-010)

1. Submit the email form with an empty body, and separately with a malformed recipient (e.g. `not-an-email`).
2. Submit the Telegram form with empty text.
3. **Expected**: each is rejected with the same validation messaging the MCP tools use (invalid recipient / invalid message), with no network call attempted.

## Scenario 9 — Audit trail parity (FR-008, SC-003)

1. After completing Scenarios 1–2 and 4–5 (a mix of success/failure on both channels), inspect the existing send-attempt audit log (however spec 017's audit trail is normally inspected — e.g. directly in storage under `.messaging/send-log/`, or via whatever tooling already exists).
2. **Expected**: every test attempt from this session appears there with the correct channel, destination, and outcome — indistinguishable in shape from an MCP-tool-initiated send (SC-003).

## Scenario 10 — Access control (FR-001, Edge Cases)

1. Sign out, then navigate directly to `http://localhost:3000/settings/test-messaging`.
2. **Expected**: redirected to sign-in, same as `/tools` or `/settings/personal-access-tokens` behave today.
