# Implementation Plan: Test Messaging Tools from the Web Interface

**Branch**: `029-test-messaging-tools` | **Date**: 2026-08-11 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/029-test-messaging-tools/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Add an owner-only web page (`/settings/test-messaging`) where the owner can send one real test email or Telegram message and immediately see the outcome — including the exact error code/message from SMTP or the Telegram Bot API on failure — without needing an MCP client. The per-attempt send logic (validate → check config → check rate limit → send → record audit) currently lives inline inside the `send_email`/`send_telegram_message` MCP tool handlers (`lib/mcp-tools/messagingTools.ts`, spec 017); this feature extracts it into two shared functions in `lib/messaging/` that both the MCP tools and a new `POST /api/messaging/test` Route Handler call, so the web path and the MCP path are guaranteed to behave identically (FR-004) rather than risk drifting apart. No new persisted entity, no new configuration, no new audit-log shape, and no new rate-limit bucket — this feature is a second entry point into spec 017's existing behavior, plus a thin page to drive it and show the result (research.md §1, §3).

## Technical Context

**Language/Version**: TypeScript 5.9, Next.js 16 (App Router), React 19, Node.js (unchanged from specs 001–028)

**Primary Dependencies**: No new runtime dependency. Reuses `nodemailer` (existing, `lib/messaging/email.ts`) and the existing `fetch`-based Telegram Bot API call (`lib/messaging/telegram.ts`) unchanged.

**Storage**: No schema change. Reuses `lib/messaging/store.ts`'s existing `.messaging/` S3 prefix for the audit log (`recordSendAttempt`) and rate-limit counter (`checkAndRecordSend`) exactly as spec 017 already does — this feature adds no new persisted key.

**Testing**: No automated test suite exists in this project — this feature follows the same convention as specs 001–028, validated via a runnable `quickstart.md` walkthrough instead. Per user instruction, tests are not run as part of this work.

**Target Platform**: Node.js server; runs locally (`npm run dev`, storage via `docker compose`) and deploys to Vercel — same as every existing API route; no runtime change.

**Project Type**: Web application — single Next.js project (`frontend/`); no new project/service. All changes are within existing `lib/messaging/`, `lib/mcp-tools/`, a new route under `app/api/messaging/`, and a new page under `app/settings/`.

**Performance Goals**: A test send completes and shows a result within a few seconds (SC-001) — same latency envelope as the existing MCP tools' own sends, since this feature calls the identical underlying SMTP/Telegram code path.

**Constraints**: Must not duplicate the send/validate/rate-limit/audit flow (FR-004) — the web route and the MCP tools must call the same shared functions, not parallel implementations. Must not introduce a new error vocabulary — failures surface the existing `MessagingErrorCode` values and the existing human-readable messages already produced by `lib/messaging/config.ts`, `lib/messaging/email.ts`, and `lib/messaging/telegram.ts` (FR-006). Must reuse the existing owner-session gate (`requireOwnerSession`) on the new route and `hasActiveOwnerSession`-gated redirect on the new page, exactly as every existing owner-only route/page already does — no new authorization mechanism. Must not add a separate rate-limit quota or an audit-log "origin" field — test sends share the exact same limit and log as tool-initiated sends (research.md §3).

**Scale/Scope**: Single owner, two channels (email, Telegram), one test send at a time. Touches: `lib/messaging/messagingTools.ts` → `lib/mcp-tools/messagingTools.ts` (refactor to call the new shared functions instead of inlining the flow), two new files in `lib/messaging/` (shared send functions), one new route (`app/api/messaging/test/route.ts`), one new page + client form component (`app/settings/test-messaging/page.tsx`, `MessagingTestForm.tsx`), `lib/i18n/dictionaries/*.ts` (all six languages — new page strings). No changes to `lib/messaging/email.ts`, `telegram.ts`, `config.ts`, `errors.ts`, `rateLimit.ts`, `auditLog.ts`, `store.ts`, or `validation.ts` — all reused as-is.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is still unfilled template placeholder content — no project principles have been ratified yet, so there are no gates to check against. Nothing to re-check post-design.

## Project Structure

### Documentation (this feature)

```text
specs/029-test-messaging-tools/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   └── messaging-test-contract.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
frontend/
├── app/
│   ├── api/
│   │   └── messaging/
│   │       └── test/
│   │           └── route.ts             # NEW: POST — owner-gated, dispatches
│   │                                     # to the shared send functions by
│   │                                     # `channel`, returns the outcome as
│   │                                     # JSON (contracts/messaging-test-
│   │                                     # contract.md; FR-001–FR-008, FR-010)
│   └── settings/
│       └── test-messaging/
│           ├── page.tsx                 # NEW: server component — owner
│           │                            # session redirect gate (same
│           │                            # pattern as app/tools/page.tsx),
│           │                            # renders MessagingTestForm (FR-001)
│           └── MessagingTestForm.tsx    # NEW: client component — email +
│                                        # Telegram forms, fetch() to
│                                        # /api/messaging/test, inline
│                                        # success/failure display (FR-005,
│                                        # FR-006), client-state "recent
│                                        # attempts" list (FR-009, User
│                                        # Story 3)
├── lib/
│   ├── mcp-tools/
│   │   └── messagingTools.ts            # CHANGED: send_email's per-
│   │                                     # recipient loop and
│   │                                     # send_telegram_message's body
│   │                                     # both call the new shared
│   │                                     # functions instead of inlining
│   │                                     # the flow (FR-004); tool-facing
│   │                                     # behavior/output unchanged
│   ├── messaging/
│   │   ├── sendEmail.ts                 # NEW: sendEmailBatch(to: string[],
│   │   │                                 # subject, body):
│   │   │                                 # Promise<EmailRecipientResult[]> —
│   │   │                                 # today's send_email handler body,
│   │   │                                 # moved verbatim (one rate-limit
│   │   │                                 # check per call, not per
│   │   │                                 # recipient — research.md §2). The
│   │   │                                 # web route calls it with a
│   │   │                                 # one-element array.
│   │   ├── sendTelegram.ts              # NEW: sendTelegramTextMessage(
│   │   │                                 # chatId, text):
│   │   │                                 # Promise<TelegramSendOutcome> —
│   │   │                                 # today's send_telegram_message
│   │   │                                 # handler body, refactored from
│   │   │                                 # throw-based to a returned
│   │   │                                 # discriminated result
│   │   │                                 # (research.md §2)
│   │   ├── email.ts                     # UNCHANGED — sendEmailToRecipient
│   │   │                                 # still the low-level SMTP call
│   │   ├── telegram.ts                  # UNCHANGED — sendTelegramMessage
│   │   │                                 # still the low-level Bot API call
│   │   ├── config.ts                    # UNCHANGED
│   │   ├── errors.ts                    # UNCHANGED — no new error codes
│   │   ├── rateLimit.ts                 # UNCHANGED
│   │   ├── auditLog.ts                  # UNCHANGED
│   │   ├── store.ts                     # UNCHANGED
│   │   └── validation.ts                # UNCHANGED
│   └── i18n/dictionaries/*.ts           # CHANGED (all six languages): new
│                                         # `settings.messagingTest` strings
│                                         # (form labels, success/failure
│                                         # templates, recent-attempts
│                                         # labels) — mirrors the existing
│                                         # `settings.pat` block's shape
└── ../README.md                         # CHANGED (optional): note the new
                                          # test page alongside the existing
                                          # settings pages, if the README
                                          # currently enumerates them
```

**Structure Decision**: Single Next.js project at `frontend/` (unchanged from spec 006). One new route segment (`app/settings/test-messaging/`) alongside the existing `app/settings/connected-apps/` and `app/settings/personal-access-tokens/`, following the same server-component-page + owner-redirect pattern; one new API route (`app/api/messaging/test/`). The only change to existing behavior-bearing code is `lib/mcp-tools/messagingTools.ts`, which is refactored (not behaviorally changed) to delegate to the two new shared functions in `lib/messaging/` — this is the mechanism that satisfies FR-004 (research.md §1).

## Complexity Tracking

Not applicable — Constitution Check recorded no violations (no ratified project principles exist yet to violate).
