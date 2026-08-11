# Feature Specification: Test Messaging Tools from the Web Interface

**Feature Branch**: `029-test-messaging-tools`

**Created**: 2026-08-11

**Status**: Draft

**Input**: User description: "Add a way to test the Telegram and Email MCP tools directly from the web interface: an owner-only page where I can send a test message (email or Telegram) and, if it fails, see the actual error returned by the underlying service (SMTP/Telegram Bot API), not just a generic failure message."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Send a test email and see the outcome (Priority: P1)

As the owner, I want to send a one-off test email from the web interface — entering a recipient, subject, and body — so I can confirm the configured SMTP account actually works without needing an MCP client.

**Why this priority**: Email is one of the two messaging channels already exposed as MCP tools (spec 017); owners currently have no way to verify it works except by asking an agent to invoke the tool, which hides the real failure detail. This is the primary pain point driving the request.

**Independent Test**: Can be fully tested by opening the test page, filling in a recipient/subject/body, submitting, and observing a clear success confirmation — delivers value standalone even before Telegram testing exists.

**Acceptance Scenarios**:

1. **Given** the owner is signed in and SMTP is fully configured, **When** they submit a test email with a valid recipient, subject, and body, **Then** the page shows a success confirmation naming the recipient.
2. **Given** SMTP is fully configured, **When** the owner submits a test email to an address the SMTP server rejects, **Then** the page shows a failure state that includes the actual error message/code the SMTP service returned (not a generic "failed to send").
3. **Given** SMTP configuration is missing or incomplete, **When** the owner submits a test email, **Then** the page shows a failure state naming which configuration is missing, without attempting a send.

---

### User Story 2 - Send a test Telegram message and see the outcome (Priority: P1)

As the owner, I want to send a one-off test message to a Telegram chat from the web interface so I can confirm the configured bot works, and see the exact reason if it doesn't (e.g., bot not a member of the chat, invalid chat ID, bad token).

**Why this priority**: Equal in importance to email — Telegram is the other channel from spec 017 with the same "no visibility into real errors" gap. Both channels are needed for the feature to satisfy the original request.

**Independent Test**: Can be fully tested by opening the test page, entering a chat ID (or leaving it blank to use the configured default) and message text, submitting, and observing success or a specific failure reason — independent of the email flow.

**Acceptance Scenarios**:

1. **Given** the owner is signed in and the Telegram bot token is configured, **When** they submit a test message with a valid chat ID and text, **Then** the page shows a success confirmation naming the chat.
2. **Given** the Telegram bot token is configured, **When** the owner submits a test message to a chat the bot cannot reach (e.g., not a member, blocked, or an invalid ID), **Then** the page shows a failure state that includes the actual error the Telegram Bot API returned.
3. **Given** the Telegram bot token is not configured, **When** the owner submits a test message, **Then** the page shows a failure state naming the missing configuration, without attempting a send.
4. **Given** a default chat ID is configured, **When** the owner submits a test message with the chat ID left blank, **Then** the message is sent to the configured default chat and the confirmation names that chat.

---

### User Story 3 - See prior test attempts (Priority: P3)

As the owner, I want the test page to show my most recent test send attempts (channel, destination, outcome, timestamp) so I don't have to guess whether a previous test actually went through.

**Why this priority**: A convenience on top of the core send-and-see-result flow (P1 stories); useful for confirming a fix took effect after reconfiguring credentials, but the feature is fully usable without it.

**Independent Test**: Can be tested by sending two test messages (one success, one failure) and confirming both appear, most-recent-first, with their outcomes, independent of the send flow itself.

**Acceptance Scenarios**:

1. **Given** the owner has sent one or more test messages this session, **When** they view the test page, **Then** they see a list of recent attempts with channel, destination, timestamp, and outcome (success or failure reason).

---

### Edge Cases

- What happens when the owner submits the form with an empty/malformed recipient (email) or empty message text? The form is rejected before any send attempt, with the same validation messaging the existing MCP tools use (invalid recipient / invalid message).
- What happens when the send is blocked by the existing rate limit (spec 017)? The page shows the rate-limit failure clearly (distinct from a delivery failure) rather than a generic error.
- What happens when a non-owner (unauthenticated visitor) tries to reach the test page or its underlying send action directly? They're redirected to sign-in / denied, exactly as every other owner-only page and API route in this project already behaves.
- What happens if the owner double-submits (clicks send twice quickly)? Each submission is treated as an independent test attempt and counted against the rate limit like any other send — no special deduplication is required.
- What happens when the underlying service (SMTP or Telegram Bot API) is unreachable rather than returning a rejection? The failure state shows a delivery-failed outcome with whatever error detail is available (e.g., connection/timeout error), same as a rejection.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide an owner-only web page for sending test messages, reachable only by a signed-in owner (same session gate as every other owner-only page, e.g. `/tools`).
- **FR-002**: The test page MUST let the owner submit a test email with a single recipient address, subject, and body.
- **FR-003**: The test page MUST let the owner submit a test Telegram message with an optional chat ID (falling back to the configured default when omitted) and message text.
- **FR-004**: The system MUST reuse the exact same send logic, configuration, validation, and rate limiting already used by the `send_email` and `send_telegram_message` MCP tools (spec 017) — the test page is a second entry point into the same behavior, not a parallel implementation.
- **FR-005**: On successful send, the system MUST show the owner a clear success confirmation identifying the channel and destination (recipient address or chat ID).
- **FR-006**: On failed send, the system MUST show the owner the specific error returned by the underlying service or validation step — including, at minimum, the error code/category (e.g., invalid recipient, missing configuration, rate limited, delivery failed) and the human-readable message the service or validation layer produced — rather than a generic "something went wrong."
- **FR-007**: The system MUST NOT attempt a send when required configuration (SMTP or Telegram) is missing, and MUST instead report which configuration is missing.
- **FR-008**: Every test send attempt (success or failure) MUST be recorded in the existing send-attempt audit trail (spec 017), identical to sends made via the MCP tools, so test sends are indistinguishable in the audit log from tool-initiated sends except by their outcome.
- **FR-009**: The test page MUST display the owner's recent test send attempts (channel, destination, timestamp, outcome) for the current session.
- **FR-010**: The system MUST validate recipient/message inputs client-side and server-side using the same rules as the MCP tools (e.g., valid email format, 1-50... for email this page sends to one recipient at a time; Telegram text length ≤ 4096 characters) before attempting a send.

### Key Entities

- **Test Send Attempt**: A single owner-initiated test message send from the web interface — channel (email or Telegram), destination (recipient address or chat ID), content (subject/body or text), timestamp, and outcome (success, or failure with error code and message). Reuses the same underlying audit record shape as tool-initiated sends (spec 017); it is not a separate stored entity, only a distinct entry point.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The owner can send a test email or Telegram message and see a success or failure result within 10 seconds of submitting, without leaving the web interface or involving an MCP client.
- **SC-002**: When a test send fails, the owner can identify the specific cause (e.g., "bot not a member of chat", "invalid recipient", "missing SMTP password") from the on-page error alone, without checking server logs.
- **SC-003**: 100% of test send attempts (success and failure) appear in the existing audit trail, verifiable by an owner comparing the test page's recent-attempts list against the audit log.
- **SC-004**: A newly-provisioned owner can confirm their messaging configuration is working (or find out exactly what's missing) within their first attempt on the test page, with no prior knowledge of environment variable names beyond what the error message tells them.

## Assumptions

- The test page sends real messages through the real configured SMTP/Telegram services — there is no sandbox/dry-run mode; "testing" means an actual send to a real destination the owner supplies.
- The test page is a new owner-only page (e.g. alongside `/tools`, `/settings/*`) rather than a modification to the existing tools management page (`/tools`); it links to/from existing owner navigation but is its own route.
- Email testing sends to exactly one recipient per test (not the 1-50 batch the MCP tool supports) since the purpose is verifying configuration, not bulk sending; the underlying batch-capable tool logic is reused, just called with a single address.
- "Recent test attempts" (User Story 3) scope is the current browser session's test sends, not a full historical audit browser — a full audit log view, if wanted, is a separate concern from this feature.
- Rate limiting (spec 017) applies to test sends exactly as it does to tool-initiated sends — this feature does not introduce a separate quota, and the owner can exhaust the shared limit by testing.
- No new authentication/authorization mechanism is introduced; the existing owner session gate is reused as-is.
