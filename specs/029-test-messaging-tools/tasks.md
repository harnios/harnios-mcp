---

description: "Task list template for feature implementation"
---

# Tasks: Test Messaging Tools from the Web Interface

**Input**: Design documents from `/specs/029-test-messaging-tools/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/messaging-test-contract.md](./contracts/messaging-test-contract.md), [quickstart.md](./quickstart.md)

**Tests**: No automated test framework exists in this repo (plan.md Testing); verification is the manual `quickstart.md` walkthrough, not automated test tasks.

**Organization**: Tasks are grouped by user story per spec.md. The Foundational phase carries the real risk of this feature — extracting `send_email`/`send_telegram_message`'s inline logic into shared functions without changing their external behavior (FR-004, research.md §2) — before either channel's test-page work or the page itself can begin. User Story 1 (email) and User Story 2 (Telegram) are both P1 and together form the MVP; User Story 3 (recent attempts) is P3 and is pure client-side UI on top of US1/US2's response shape.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)

## Path Conventions

Single Next.js app — all paths are under `frontend/` (see plan.md's Project Structure).

---

## Phase 1: Foundational (Blocking Prerequisites)

**Purpose**: Extract today's inline `send_email`/`send_telegram_message` logic into shared, independently-callable functions, with zero change to either tool's external behavior — everything downstream (the web route, the page) depends on these existing and being correct.

**⚠️ CRITICAL**: No user story can be implemented or verified until this phase is complete

- [X] T001 [P] Create `frontend/lib/messaging/sendEmail.ts` exporting the `EmailRecipientResult` interface (`{ to: string; status: "success" | "failure"; errorCode?: MessagingErrorCode; errorMessage?: string }`, moved from `frontend/lib/mcp-tools/messagingTools.ts`) and `sendEmailBatch(to: string[], subject: string, body: string): Promise<EmailRecipientResult[]>` — move the current `send_email` tool handler's body verbatim (research.md §2): throw `MessagingError("invalid_message", ...)` if `subject`/`body` are empty; `readMessagingConfig()` + `validateEmailConfig()`; `checkAndRecordSend()` exactly once for the whole call (not per recipient); then for each address in `to`, validate with `isValidEmailAddress`, call `sendEmailToRecipient`, call `recordSendAttempt`, and push a result — never throwing for an individual recipient's failure. Imports: `readMessagingConfig`/`validateEmailConfig` from `./config`, `sendEmailToRecipient` from `./email`, `MessagingError`/`MessagingErrorCode` from `./errors`, `checkAndRecordSend` from `./rateLimit`, `recordSendAttempt` from `./auditLog`, `isValidEmailAddress` from `./validation` (all unchanged)
- [X] T002 [P] Create `frontend/lib/messaging/sendTelegram.ts` exporting `TelegramSendOutcome` (`{ chatId: string } & ({ status: "success" } | { status: "failure"; errorCode: MessagingErrorCode; errorMessage: string })`) and `sendTelegramTextMessage(chatId: string | undefined, text: string): Promise<TelegramSendOutcome>` — move the current `send_telegram_message` tool handler's body, refactored from throw-based to return-based (research.md §2): validate `text` length, `readMessagingConfig()` + `validateTelegramConfig()`, resolve `targetChatId = chatId ?? config.telegramChatId` (return a `missing_config` failure outcome if neither is set), `checkAndRecordSend()`, attempt `sendTelegramMessage`, call `recordSendAttempt` on both success and failure, and return the outcome instead of throwing/returning early. Same imports as T001 but from `./telegram` instead of `./email`
- [X] T003 In `frontend/lib/mcp-tools/messagingTools.ts`, replace the `send_email` tool's inline body with a call to `sendEmailBatch(to, subject, body)` (T001) inside the existing try/catch — `return ok({ results })` on success, `return messagingErrorResult(err)` on a thrown call-level `MessagingError`, exactly as today. Remove the now-dead `EmailRecipientResult` interface and per-recipient loop from this file (moved to T001) — depends on T001
- [X] T004 In `frontend/lib/mcp-tools/messagingTools.ts`, replace the `send_telegram_message` tool's inline body with a call to `sendTelegramTextMessage(chatId, text)` (T002): on `status: "success"` return `ok({ chatId: result.chatId, status: "success" })` (unchanged shape from today); on `status: "failure"` return `messagingErrorResult(new MessagingError(result.errorCode, result.errorMessage))` so the tool's `CallToolResult` shape is byte-for-byte unchanged from today — depends on T002
- [X] T005 Manually verify no behavior change: with a working MCP client (or by re-running spec 017's own quickstart scenarios) call `send_email` with a mix of valid/invalid recipients and `send_telegram_message` with a valid and an invalid chat ID; confirm both tools' results, error codes/messages, and audit log entries are identical to pre-refactor behavior — depends on T003, T004

**Checkpoint**: Foundation ready — `sendEmailBatch` and `sendTelegramTextMessage` exist, are used by the (unchanged-behavior) MCP tools, and are ready for a second caller

---

## Phase 2: User Story 1 - Send a test email and see the outcome (Priority: P1) 🎯 MVP

**Goal**: An owner-only page lets the owner send one test email and see a clear success confirmation or the real underlying error.

**Independent Test**: Open the test page, submit a valid recipient/subject/body, see a success confirmation naming the recipient; submit a recipient the SMTP server rejects, see the real rejection error inline (quickstart.md Scenarios 1-3).

### Implementation for User Story 1

- [X] T006 [US1] Create `frontend/app/api/messaging/test/route.ts` exporting `POST`: `requireOwnerSession()` gate (401 on failure, unchanged pattern from every other route); parse the JSON body, returning `400 { code: "invalid_request", message: ... }` for a missing/unknown `channel` or missing required field for that channel (contracts/messaging-test-contract.md); for `channel: "email"`, call `sendEmailBatch([body.to], body.subject, body.body)` (T001) inside a try/catch — on a thrown `MessagingError`, respond `200 { channel: "email", status: "failure", destination: body.to, errorCode: err.code, errorMessage: err.message }`; on success, read `results[0]` and respond `200 { channel: "email", status: results[0].status, destination: body.to, errorCode: results[0].errorCode, errorMessage: results[0].errorMessage }` (this implements only the email branch — the telegram branch is added in T012, US2)
- [X] T007 [US1] Create `frontend/app/settings/test-messaging/page.tsx`: server component, `hasActiveOwnerSession()` redirect gate to `/oauth/login?continue=...` (same pattern as `frontend/app/tools/page.tsx` and `frontend/app/settings/personal-access-tokens/page.tsx`), page title/description from a new `settings.messagingTest` dictionary block (T010). **Deviation from the original task text**: renders `<MessagingTestForm language={language} />` (not `dict={...}`) — passing the assembled `dict` object crashed with "Functions cannot be passed directly to Client Components" (the `charCount`/`success`/`failure` template functions aren't serializable across the server→client boundary). Fixed by following `EditorApp.tsx`'s existing documented pattern: pass the plain `language` string and let the client component call `getDictionary(language)` itself.
- [X] T008 [US1] Create `frontend/app/settings/test-messaging/MessagingTestForm.tsx` (`"use client"`): an email test form (recipient/subject/body inputs, submit button) that on submit does `fetch("/api/messaging/test", { method: "POST", body: JSON.stringify({ channel: "email", to, subject, body }) })` (T006), disables the submit button while pending, and renders an inline result banner below the form — success styling naming the recipient on `status: "success"`, failure styling showing `errorCode` and `errorMessage` verbatim on `status: "failure"` (FR-005, FR-006). Client-side pre-submit validation mirrors `isValidEmailAddress`/non-empty subject+body (a small inline regex/check, not importing the server-only `./validation` module) so obviously-invalid input never reaches the network call (FR-010) — this task builds only the email half of the form; the Telegram half is added in T013 (US2)
- [X] T009 [US1] Wire a link to `/settings/test-messaging` from existing owner navigation (e.g. alongside the links to `/tools`/`/settings/personal-access-tokens`/`/settings/connected-apps` — check `frontend/app/dashboard` or wherever spec 026's root dashboard/nav lists owner pages) so the page is discoverable, not just directly-navigable
- [X] T010 [US1] Add a `settings.messagingTest` block to the `Dictionary` interface in `frontend/lib/i18n/dictionaries/types.ts` (title, description, email form labels — recipient/subject/body/submit, success template taking a destination, failure template taking errorCode+errorMessage, missing-config message) and implement it in all six `frontend/lib/i18n/dictionaries/{en,it,fr,de,es,ru}.ts` files, mirroring the existing `settings.pat` block's shape and tone
- [ ] T011 [US1] Run quickstart.md Scenarios 1, 2, 3, 8 (email half), and 10 against a local dev server with real SMTP credentials — confirm success confirmation, real SMTP rejection error text, missing-config message, client-side validation rejection, and the sign-out redirect all behave as described

**Checkpoint**: User Story 1 is fully functional and independently testable — an owner can test email delivery from the web interface

---

## Phase 3: User Story 2 - Send a test Telegram message and see the outcome (Priority: P1) 🎯 MVP

**Goal**: The same test page also lets the owner send one test Telegram message and see a clear success confirmation or the real Telegram Bot API error.

**Independent Test**: Submit a valid chat ID and text, see a success confirmation naming the chat; submit a chat ID the bot can't reach, see the real Telegram error inline; leave chat ID blank with a default configured, confirm it's used (quickstart.md Scenarios 4-7).

### Implementation for User Story 2

- [X] T012 [US2] In `frontend/app/api/messaging/test/route.ts` (T006), add the `channel: "telegram"` branch: call `sendTelegramTextMessage(body.chatId, body.text)` (T002) — it never throws, so map its `TelegramSendOutcome` directly to `200 { channel: "telegram", status, destination: result.chatId, errorCode?, errorMessage? }` — depends on T006
- [X] T013 [US2] In `frontend/app/settings/test-messaging/MessagingTestForm.tsx` (T008), add the Telegram test form (optional chat ID input, text input/textarea with a visible character count against the 4096 limit, submit button) alongside the email form, posting `{ channel: "telegram", chatId: chatId || undefined, text }` to the same route and rendering its result with the same success/failure banner pattern as the email form — depends on T008
- [X] T014 [US2] Extend the `settings.messagingTest` dictionary block (T010) in `frontend/lib/i18n/dictionaries/types.ts` and all six locale files with the Telegram form's labels (chat ID, text, default-chat hint, submit, success/failure templates) — depends on T010
- [ ] T015 [US2] Run quickstart.md Scenarios 4, 5, 6, 7, and 8 (Telegram half) against a local dev server with a real bot token — confirm success confirmation, real Telegram API error text, default-chat-ID fallback, missing-config message, and client-side validation all behave as described

**Checkpoint**: User Stories 1 AND 2 both work independently — the test page fully covers both messaging channels (MVP complete)

---

## Phase 4: User Story 3 - See prior test attempts (Priority: P3)

**Goal**: The test page shows the owner's recent test send attempts (channel, destination, timestamp, outcome) from the current session, so they don't have to guess whether a prior test went through.

**Independent Test**: Send two test messages (one success, one failure), confirm both appear in a recent-attempts list, most-recent-first, with their outcomes (quickstart.md validates this implicitly across earlier scenarios; no dedicated scenario needed since it's observed passively).

### Implementation for User Story 3

- [X] T016 [US3] In `frontend/app/settings/test-messaging/MessagingTestForm.tsx`, add a `useState<TestAttempt[]>([])` list (data-model.md Test Attempt: channel, destination, timestamp set client-side on response receipt, outcome) that both the email and Telegram submit handlers (T008, T013) prepend to on every response (success or failure), capped at 10 entries; render it below the two forms as a simple list/table showing channel, destination, local timestamp, and outcome (reusing the same success/failure label logic as the inline banners) — depends on T008, T013
- [X] T017 [US3] Add the "recent attempts" section's labels (heading, empty state, column labels) to the `settings.messagingTest` dictionary block and all six locale files — depends on T010

**Checkpoint**: All three user stories are independently functional — the full feature is complete

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Final consistency pass across the whole feature

- [X] T018 [P] Run `cd frontend && npx tsc --noEmit` to confirm the full set of changes (new files, `messagingTools.ts` refactor, new route, new page/component, dictionary changes across 6 files) compile cleanly
- [ ] T019 Update `frontend/../README.md` (or wherever the project's owner-facing pages are enumerated, if anywhere) to mention the new test-messaging page alongside the existing settings pages, if that list currently exists
- [ ] T020 Run the full `quickstart.md` walkthrough (all 10 scenarios) end-to-end in one pass as a final sign-off

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 1)**: No dependencies — can start immediately. BLOCKS all user stories.
- **User Story 1 (Phase 2)**: Depends on Foundational (T001, T003 specifically). No dependency on US2.
- **User Story 2 (Phase 3)**: Depends on Foundational (T002, T004) and on T006/T008 from US1 (extends the same route file and the same form component rather than creating parallel ones) — not independently deployable before US1's route/page scaffolding exists, but independently *testable* once both are in place, per spec.md's intent that US1 and US2 are equal-priority halves of one MVP.
- **User Story 3 (Phase 4)**: Depends on US1 (T008) and US2 (T013) both being done, since it extends the same form component with a list fed by both forms' responses.
- **Polish (Phase 5)**: Depends on all desired user stories being complete.

### Parallel Opportunities

- T001 and T002 (Foundational) touch different files and different channels — run in parallel.
- T007 (page) and T010 (dictionary types/en) can start as soon as T006 exists, in parallel with continued work on T008.
- Within Phase 5, T018 and T019 are independent of each other.

---

## Implementation Strategy

### MVP First (User Stories 1 + 2 together)

Both P1 stories share the route file and the form component, so in practice they're built together rather than one-then-the-other: complete Phase 1 (Foundational), then Phase 2 and Phase 3 essentially interleaved (T006→T012 both land in the same route file; T008→T013 both land in the same component) before the first real end-to-end test. Stop and validate with quickstart.md Scenarios 1-8 once both channels work.

### Incremental Delivery

1. Foundational → both MCP tools verified unchanged (T005) — safe checkpoint, nothing user-facing yet.
2. US1 + US2 together → the test page is fully usable for both channels (MVP).
3. US3 → recent-attempts list added on top, no risk to the already-working send flow.
4. Polish → typecheck, docs, final full walkthrough.

---

## Notes

- No automated tests exist in this project (plan.md Testing) — every story's validation step is a `quickstart.md` scenario, not a test file.
- The Foundational phase's real deliverable is *behavioral parity*: T005 is not optional busywork — it's the check that the refactor didn't silently change what the MCP tools do, which is exactly the risk research.md §2 calls out.
- Commit after each task or logical group; stop at either checkpoint (end of Phase 1, end of Phase 3) to validate before continuing.
