# Phase 0 Research: Test Messaging Tools from the Web Interface

## §1. Where the reused send logic currently lives

**Decision**: Extract the per-attempt send logic (validate → check config → check rate limit → send → record audit) out of `lib/mcp-tools/messagingTools.ts`'s two tool handlers into two new pure async functions in `lib/messaging/`, and have both the MCP tool handlers and the new web API route call them.

**Rationale**: Today `registerMessagingTools()` inlines the entire flow (config read, `validateEmailConfig`/`validateTelegramConfig`, `checkAndRecordSend`, the actual `sendEmailToRecipient`/`sendTelegramMessage` call, and `recordSendAttempt`) directly inside each tool's callback, wrapping the final MCP-shaped result around it. A web route needs the exact same flow but must return a plain JSON outcome instead of an MCP `CallToolResult`. Extracting the flow into channel-scoped functions that return a small `SendOutcome` value (not an MCP result) lets both callers — the MCP tool callback and the new Route Handler — share one implementation and just format the outcome differently at the edge. This directly satisfies FR-004 ("reuse the exact same send logic... not a parallel implementation").

**Alternatives considered**:
- *Have the web route call into the MCP server in-process* (construct a `McpServer`, invoke the registered tool callback directly): rejected — tool callbacks are typed to return `CallToolResult` and are registered against a live `McpServer` instance tied to a request's transport; invoking one outside that context is an awkward, indirect way to call what is really a plain function, and existing code already treats `messagingTools.ts` as returning MCP-shaped output only at the outermost layer.
- *Duplicate the flow in the new route*: rejected outright by FR-004 and by the project's own pattern elsewhere (e.g. `lib/storage/files.ts` is called from both `app/api/file/route.ts` and the MCP file tools — shared library, thin per-transport wrapper).

## §2. Shape of the shared functions — why email and Telegram aren't symmetric

**Decision**: The two channels get differently-shaped shared functions, because their MCP tools aren't symmetric today:

- **Email is call-level batched**: `send_email` takes 1-50 recipients and calls `checkAndRecordSend()` (the rate limiter) exactly **once per call**, regardless of recipient count — then loops recipients, validating/sending/auditing each independently without failing the whole call for one bad address. The shared function preserves this exactly: `sendEmailBatch(to: string[], subject: string, body: string): Promise<EmailRecipientResult[]>` in `lib/messaging/sendEmail.ts` — literally the body of today's tool handler, moved as-is. It throws a `MessagingError` for call-level failures (`invalid_message`, `missing_config`, `rate_limited`) before the loop starts, and returns a per-recipient `{ to, status, errorCode?, errorMessage? }[]` for recipient-level outcomes (never throws for one bad recipient) — unchanged from today.
- **Telegram is already single-message-per-call**: `send_telegram_message` sends exactly one message per call, so folding the entire flow (validate → config → resolve chat ID → rate limit → send → audit) into one non-throwing function changes nothing about call semantics. `sendTelegramTextMessage(chatId: string | undefined, text: string): Promise<TelegramSendOutcome>` in `lib/messaging/sendTelegram.ts`, where `TelegramSendOutcome = { chatId: string } & ({ status: "success" } | { status: "failure"; errorCode: MessagingErrorCode; errorMessage: string })`, replaces today's throw-based control flow with a returned value — an internal refactor only; the MCP tool's external `CallToolResult` shape is unchanged.

The **test page's single-recipient email test reuses `sendEmailBatch` by calling it with a one-element array** (`sendEmailBatch([to], subject, body)`) and reading `results[0]` — not a second, parallel single-recipient function. This is what keeps rate-limiting semantics identical between "send to 50 recipients via MCP" and "send a test email via the web page": both are exactly one call to the one shared function, consuming exactly one rate-limit unit.

**Rationale**: Reusing the *exact* existing per-call rate-limit boundary (FR-004) requires the shared function's call boundary to match the MCP tool's call boundary, not the recipient boundary. Wrapping config-read + rate-limit-check + per-recipient-loop into a function called once per recipient (a tempting "clean, uniform per-message function" symmetric with Telegram) would silently change email's rate-limit semantics from "1 unit per send_email call" to "1 unit per recipient" — a real behavior regression this feature must not introduce.

**Alternatives considered**: A single per-recipient email function called in a loop by both the MCP tool and the web route (fully symmetric with Telegram) — rejected for the reason above. Keeping the rate-limit check and config validation duplicated at the top of both callers instead of inside a shared function — rejected because it's exactly the kind of duplicated call-level logic FR-004 says not to have; `sendEmailBatch` already owns that once, correctly.

## §3. Reusing the audit trail and rate limiter as-is

**Decision**: No changes to `lib/messaging/auditLog.ts`, `lib/messaging/rateLimit.ts`, or `lib/messaging/store.ts`. The shared send functions call `recordSendAttempt()` and `checkAndRecordSend()` exactly as the current tool handlers do.

**Rationale**: FR-008 requires test sends to be indistinguishable from tool-initiated sends in the audit trail except by outcome, and the spec's assumption is that rate limiting applies identically to both entry points with no separate quota. Since the shared functions are the *only* place either entry point calls these, this falls out for free — no new "origin" field, no new rate-limit bucket.

**Alternatives considered**: Tagging audit records with an `origin: "test" | "tool"` field — rejected as unnecessary scope creep; nothing in the spec asks for filtering the audit trail by origin, and User Story 3's "recent attempts" list is served from client-side session state (§5), not by querying the audit log.

## §4. New web entry point shape

**Decision**: One new Route Handler, `POST /api/file`-sibling style at `app/api/messaging/test/route.ts`, gated by `requireOwnerSession()` exactly like every other `app/api/*` route. Request body is a small discriminated union by `channel`:
```ts
{ channel: "email"; to: string; subject: string; body: string }
| { channel: "telegram"; chatId?: string; text: string }
```
Response body: `{ status: "success"; destination: string } | { status: "failure"; errorCode: MessagingErrorCode; errorMessage: string; destination?: string }`, HTTP 200 for a handled success-or-failure outcome (the *request* succeeded even when the *send* failed — same convention as MCP tools, which return `isError` inside a 200-equivalent result rather than an HTTP error status). A missing/malformed body (wrong shape, unknown channel) is the one case that gets a 400.

**Rationale**: A single endpoint keeps routing simple and matches how `messagingTools.ts` already treats both channels as siblings of one concern. Returning send failures as HTTP 200 bodies (not 4xx/5xx) means the client's fetch-handling code doesn't need to special-case network-layer errors vs. business-logic failures — it always gets a JSON body describing the outcome, mirroring `app/api/file/route.ts`'s own `errorResponse()`/`STATUS_BY_CODE` pattern closely enough (structured `{ code, message }`) that this route reuses the same idea but does not need distinct HTTP status codes per `MessagingErrorCode`, since (unlike file operations) every outcome here is meaningful to show inline in the same form.

**Alternatives considered**: Two separate routes (`/api/messaging/test-email`, `/api/messaging/test-telegram`) — considered and rejected only for minor simplicity; a single route with a `channel` discriminant is marginally less duplication for near-identical auth/parsing boilerplate. Either is a reasonable, low-risk choice; the single-route form was picked to keep the request/response contract in one file.

## §5. "Recent test attempts" (User Story 3) storage

**Decision**: Client-side only — a React `useState` array in the test page's client component, prepended to on every submit response, capped at a small number (10), not persisted server-side and not sourced from `lib/messaging/store.ts`'s audit log.

**Rationale**: The spec's own Assumptions section scopes this explicitly to "the current browser session's test sends, not a full historical audit browser." A full audit browser is out of scope and would require new list/pagination UI over `.messaging/send-log/*` that nothing in this feature's user stories asks for. Client state also means the P3 story adds zero backend surface — pure UI — consistent with its priority relative to the two P1 stories that carry all the real risk (external service integration, error surfacing).

**Alternatives considered**: Reading back recent entries from `listRecords<SendAttemptRecord>("send-log/")` (already implemented, used by no caller today) — rejected for v1 because it would show *all* recent sends (test and tool-initiated mixed) with no origin marker to filter by (§3), which doesn't match "my test attempts" and would need either a new field or client-side filtering by nothing meaningful. Left as a natural follow-up if a real audit-browsing feature is ever requested.

## §6. Form/page UX pattern

**Decision**: A new owner-only page at `app/settings/test-messaging/page.tsx` (server component, same auth-redirect pattern as `app/settings/personal-access-tokens/page.tsx` and `app/tools/page.tsx`), rendering a client component (`MessagingTestForm.tsx`) that holds two small forms (email, Telegram) and does its own `fetch()` to `POST /api/messaging/test`, matching the fetch-driven client-component pattern already used by `app/files/FileEditor.tsx` (spec 003/019) rather than the plain-POST-and-redirect pattern used by the simpler settings pages — because this page needs to show an inline result (including the exact error text) without a full navigation, and needs to accumulate a growing client-side list across multiple submits in the same page view.

**Rationale**: Both patterns already coexist in this codebase for exactly this reason (simple CRUD-and-redirect vs. rich same-page feedback); picking the one that already matches the UX need is more consistent than inventing a third pattern.

**Alternatives considered**: Server Actions — not used anywhere else in this codebase (every existing mutation is a Route Handler called via `<form action="...">` or client-side `fetch`), so introducing them here would be a new, inconsistent pattern for one feature.
