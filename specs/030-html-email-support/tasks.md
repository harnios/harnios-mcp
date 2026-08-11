---

description: "Task list template for feature implementation"
---

# Tasks: Send Email Messages in HTML

**Input**: Design documents from `/specs/030-html-email-support/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/html-email-contract.md](./contracts/html-email-contract.md), [quickstart.md](./quickstart.md)

**Tests**: No automated test framework exists in this repo (plan.md Testing); verification is the manual `quickstart.md` walkthrough, not automated test tasks.

**Organization**: Tasks are grouped by user story per spec.md. The Foundational phase carries the actual send-path change (`lib/messaging/email.ts` + `sendEmail.ts`) because both User Story 1 (the MCP tool) and User Story 3 (the web test page) call it — it isn't specific to either. User Story 2 (existing plain-text sends unaffected) requires no new code at all — it's a property of how Foundational is built (the flag defaults to `false` and the plain-text branch is untouched, research.md §3) — so its phase is verification-only, mirroring how spec 017 and spec 029 both handled a "nothing should change" story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)

## Path Conventions

Single Next.js app — all paths are under `frontend/` (see plan.md's Project Structure).

---

## Phase 1: Setup

**Purpose**: Add the one new dependency this feature needs before any code references it

- [X] T001 Add `html-to-text` (^10) to `frontend/package.json` dependencies and run `npm install` from `frontend/` (research.md §2)

**Checkpoint**: Dependency installed — ready for Foundational implementation

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The actual HTML-send mechanism, used by both entry points (MCP tool and web test page)

**⚠️ CRITICAL**: No user story can be implemented or verified until this phase is complete

- [X] T002 In `frontend/lib/messaging/email.ts`, add an `isHtml: boolean` parameter to `sendEmailToRecipient(to, subject, body, config, isHtml)` (default `false` if the call sites below don't always pass it explicitly — prefer requiring callers to pass it explicitly for clarity). Import `convert` from `html-to-text` (T001). When `isHtml` is `true`, call `transport.sendMail({ from: config.smtpFrom, to, subject, html: body, text: convert(body) })`; when `false`, call it exactly as today — `transport.sendMail({ from: config.smtpFrom, to, subject, text: body })` — with no added branching in that path beyond the boolean check itself (research.md §3, FR-002, FR-003, FR-004)
- [X] T003 In `frontend/lib/messaging/sendEmail.ts`, add an `isHtml: boolean` parameter to `sendEmailBatch(to, subject, body, isHtml)`, passed straight through to `sendEmailToRecipient` (T002) in the per-recipient loop — no other logic in this function changes (research.md §1) — depends on T002
- [X] T004 Run `cd frontend && npx tsc --noEmit` to confirm T002/T003's signature change doesn't break any existing call site before proceeding — expect no errors yet from `messagingTools.ts`/`route.ts` since those are updated in the next phases (this just confirms `sendEmail.ts`/`email.ts` themselves are internally consistent) — depends on T003

**Checkpoint**: Foundation ready — `sendEmailBatch`/`sendEmailToRecipient` support HTML; no caller has opted in yet

---

## Phase 3: User Story 1 - Send a richly-formatted email (Priority: P1) 🎯 MVP

**Goal**: The `send_email` MCP tool accepts an `isHtml` flag and delivers HTML-rendered email with a readable plain-text fallback.

**Independent Test**: Call `send_email` with `isHtml: true` and an HTML body via an MCP client; confirm the recipient's email client renders formatting, not raw markup, and that malformed HTML still delivers (quickstart.md Scenarios 1, 2, 3, 5).

### Implementation for User Story 1

- [X] T005 [US1] In `frontend/lib/mcp-tools/messagingTools.ts`, add `isHtml: z.boolean().optional().describe("Whether body is HTML instead of plain text. Defaults to false. When true, a plain-text alternative is generated automatically for non-HTML mail clients.")` to `send_email`'s `inputSchema`, and pass `isHtml ?? false` as the fourth argument to `sendEmailBatch(to, subject, body, isHtml ?? false)` (T003) — depends on T003
- [ ] T006 [US1] Run quickstart.md Scenarios 1, 2, 3, and 5 against a local dev server with real SMTP credentials and a connected MCP client — confirm HTML rendering, a sensible plain-text alternative in the raw message source, malformed-HTML tolerance, and that a call without `isHtml` behaves exactly as spec 017's original quickstart described. **Partially verified without real credentials**: `html-to-text` was confirmed directly (`node -e`) to produce readable output for both well-formed HTML (preserving link URLs) and malformed/unclosed markup (no throw) — the mechanism behind FR-002/FR-003/FR-006. Actual inbox delivery/rendering still needs real SMTP credentials to confirm end-to-end.

**Checkpoint**: User Story 1 is fully functional and independently testable via the MCP tool alone

---

## Phase 4: User Story 2 - Existing plain-text sends are unaffected (Priority: P1) 🎯 MVP

**Goal**: Confirm the backward-compatibility guarantee that Foundational's design (T002/T003) already provides — no code changes, verification only.

**Independent Test**: Send a plain-text email (as before this feature existed, `isHtml` omitted) and confirm identical behavior to pre-030, including literal `<`/`>` characters in the body being preserved as-is.

### Verification for User Story 2

- [ ] T007 [US2] Run quickstart.md Scenario 4 (both parts) against a local dev server: send a plain body with `isHtml` omitted and confirm no formatting artifacts; send a plain body containing literal `<`/`>` characters with `isHtml` omitted and confirm those characters appear literally in the received email, unchanged from spec 017/029's original behavior — depends on T005 (needs the updated tool/route to exist so `isHtml` can be *omitted* from a real call, not just theoretically absent). **Partially verified without real credentials**: curl'd `/api/messaging/test` with and without `isHtml` (SMTP unconfigured in this sandbox) — both requests fail identically at the `missing_config` check, confirming `isHtml` doesn't alter the pre-send code path. Full byte-for-byte delivery comparison needs real SMTP credentials.

**Checkpoint**: User Stories 1 AND 2 both verified — the MCP tool's HTML capability is additive with zero regression (MVP complete for the tool-only path)

---

## Phase 5: User Story 3 - Test an HTML email from the web interface (Priority: P2)

**Goal**: The existing messaging test page (spec 029) lets the owner send a test email as HTML and see it delivered, using the same underlying capability as User Story 1.

**Independent Test**: On `/settings/test-messaging`, check "Send as HTML", submit a body with markup, and confirm a properly-rendered email in the target inbox plus the same success/failure outcome reporting as any other test send (quickstart.md Scenario 1 via the web page, Scenario 2).

### Implementation for User Story 3

- [X] T008 [US3] In `frontend/app/api/messaging/test/route.ts`, add `isHtml?: boolean` to the `EmailTestRequest` interface, read it from the parsed body (default `false` if absent), and pass it as the fourth argument to `sendEmailBatch([to], subject, emailBody, isHtml ?? false)` (T003) — depends on T003
- [X] T009 [US3] In `frontend/app/settings/test-messaging/MessagingTestForm.tsx`, add an `isHtml` boolean state (`useState(false)`) and a checkbox in the email form section labeled via a new `dict.email.htmlToggle` string (T010), included in the POST payload as `{ channel: "email", to, subject, body: emailBody, isHtml }` (T008) — depends on T008
- [X] T010 [US3] Add an `htmlToggle: string` field to the `settings.messagingTest.email` block in `frontend/lib/i18n/dictionaries/types.ts` and implement it in all six `frontend/lib/i18n/dictionaries/{en,it,fr,de,es,ru}.ts` files (e.g. EN: "Send as HTML"), mirroring the existing email-section labels' tone
- [ ] T011 [US3] Run quickstart.md Scenarios 1 and 2 specifically via the web test page (not the MCP tool) — confirm the checkbox toggles `isHtml` correctly and the delivered email matches Scenario 1/2's expectations — depends on T009, T010. **Partially verified without real credentials**: confirmed via curl (authenticated session) that the "Send as HTML" checkbox renders correctly (`type="checkbox"`, localized label) on `/settings/test-messaging`. Did not verify the checkbox's submitted value reaches a real inbox — needs real SMTP credentials and a browser session.

**Checkpoint**: All three user stories are independently functional — the full feature is complete on both entry points

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final consistency pass across the whole feature

- [X] T012 [P] Run `cd frontend && npx tsc --noEmit` to confirm the full set of changes (dependency, `email.ts`/`sendEmail.ts` signature changes, tool schema, route, form component, 6 dictionary files) compile cleanly
- [ ] T013 Run the full `quickstart.md` walkthrough (all 5 scenarios) end-to-end in one pass as a final sign-off — blocked on real SMTP credentials + a connected MCP client in this environment (see T006/T007/T011 notes); code-level verification (typecheck, build, `html-to-text` behavior, config-check ordering) is complete

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately.
- **Foundational (Phase 2)**: Depends on Setup (T001). BLOCKS all user stories.
- **User Story 1 (Phase 3)**: Depends on Foundational (T002, T003). No dependency on US2/US3.
- **User Story 2 (Phase 4)**: Depends on Foundational directly for the guarantee it verifies, and practically depends on T005 (US1) existing so there's an updated call site to test "omitted `isHtml`" against.
- **User Story 3 (Phase 5)**: Depends on Foundational (T002, T003) — independent of US1/US2, since it calls `sendEmailBatch` directly, not through the MCP tool.
- **Polish (Phase 6)**: Depends on all desired user stories being complete.

### Parallel Opportunities

- T005 (US1, `messagingTools.ts`) and T008 (US3, `route.ts`) touch different files and both only depend on Foundational (T003) — can run in parallel.
- T009 (US3 form) and T010 (US3 dictionary) touch different files — T009 can be written in parallel with T010 as long as the dictionary key name is agreed first (trivial), then wired together.
- Within Phase 6, T012 has no dependency on T013 beyond both needing the feature complete.

---

## Implementation Strategy

### MVP First (User Story 1 + User Story 2 verification)

Complete Phase 1 (Setup) → Phase 2 (Foundational) → Phase 3 (US1) → Phase 4 (US2 verification). At this checkpoint, the HTML capability is fully working and verified non-regressive via the MCP tool alone — a legitimate stopping point if the web test page toggle (US3) isn't needed immediately.

### Incremental Delivery

1. Setup + Foundational → HTML send mechanism exists, unused by any caller yet.
2. US1 → MCP tool can send HTML; US2 verification confirms no regression (MVP).
3. US3 → web test page gets the same capability via a checkbox.
4. Polish → typecheck, full walkthrough.

---

## Notes

- No automated tests exist in this project (plan.md Testing) — every story's validation step is a `quickstart.md` scenario, not a test file.
- T002 is the task that actually matters most for correctness: it's the one place where getting the `isHtml`-false branch byte-for-byte unchanged (FR-004) versus the `isHtml`-true branch (FR-002/FR-003) both live side by side — review it carefully against research.md §3 before moving on.
- Commit after each task or logical group; stop at either checkpoint (end of Phase 2, end of Phase 4) to validate before continuing.
