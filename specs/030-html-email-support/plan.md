# Implementation Plan: Send Email Messages in HTML

**Branch**: `030-html-email-support` | **Date**: 2026-08-11 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/030-html-email-support/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Let a caller of the email-sending capability — the `send_email` MCP tool (spec 017) or the web test page (spec 029) — mark the message body as HTML instead of plain text, so recipients see rendered formatting (headings, emphasis, links, lists) instead of raw markup. Adds one optional boolean field, `isHtml` (default `false`), threaded from the tool's input schema / the test route's request body down through `sendEmailBatch()` into `sendEmailToRecipient()`, where it switches `nodemailer`'s `sendMail()` call from `{ text: body }` (today's only path, untouched when `isHtml` is falsy) to `{ html: body, text: htmlToText(body) }` — the plain-text alternative required by FR-003 is derived automatically via the new `html-to-text` dependency, never authored separately by the caller. No new persisted entity, no new error code, no change to the rate limiter or audit log (research.md §5) — this is an additive field on an existing request shape, delivered through the exact same shared send logic both entry points already use (spec 029's FR-004 precedent).

## Technical Context

**Language/Version**: TypeScript 5.9, Next.js 16 (App Router), React 19, Node.js (unchanged from specs 001–029)

**Primary Dependencies**: New — `html-to-text` (^10, research.md §2), used to derive a plain-text alternative from a caller-supplied HTML body. Existing — `nodemailer` (spec 017), whose `sendMail()` already accepts `html` alongside `text`; no version change needed.

**Storage**: No change. No new persisted field on the Send Attempt Record, Rate Limit State, or Messaging Configuration (data-model.md, research.md §5).

**Testing**: No automated test suite exists in this project — this feature follows the same convention as specs 001–029, validated via `quickstart.md`'s manual walkthrough. Per user instruction, tests are not run as part of this work.

**Target Platform**: Node.js server; runs locally (`npm run dev`) and deploys to Vercel — same as every existing route; no runtime change.

**Project Type**: Web application — single Next.js project (`frontend/`); no new route, no new page. All changes are additive edits to existing files from specs 017/029.

**Performance Goals**: HTML-to-text conversion is a synchronous, in-process transform over a single email body (not a batch/bulk operation) — no measurable latency impact beyond the existing send path's own timing.

**Constraints**: Must not change the outcome of any existing plain-text send (FR-004, SC-002) — the plain-text code path must remain byte-for-byte identical when `isHtml` is absent/false (research.md §3). Must not introduce a new failure mode for malformed HTML (FR-006) — delivery proceeds best-effort, same as any email client's own tolerance for imperfect markup (research.md §2). Must not add sanitization/content restriction beyond what already exists for plain text (spec.md Assumptions) — the sender is a trusted party (the owner or an AI assistant acting on their behalf), not untrusted content being rendered back to its author. Must keep both entry points (MCP tool, web test page) behaviorally identical for the same input, since both call the same shared function (FR-005, mirrors spec 029's own constraint).

**Scale/Scope**: Single new dependency, one new optional field threaded through four existing files, plus the web form's UI toggle and its dictionary strings. Touches: `frontend/lib/messaging/email.ts` (`sendEmailToRecipient` gains an `isHtml` parameter and the `html-to-text` conversion), `frontend/lib/messaging/sendEmail.ts` (`sendEmailBatch` threads `isHtml` through), `frontend/lib/mcp-tools/messagingTools.ts` (`send_email`'s Zod input schema gains `isHtml`), `frontend/app/api/messaging/test/route.ts` (`EmailTestRequest` gains `isHtml`), `frontend/app/settings/test-messaging/MessagingTestForm.tsx` (a "Send as HTML" checkbox), `frontend/lib/i18n/dictionaries/*.ts` (all six languages — one new checkbox label). No new files except the dependency itself in `package.json`/`package-lock.json`.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is still unfilled template placeholder content — no project principles have been ratified yet, so there are no gates to check against. Nothing to re-check post-design.

## Project Structure

### Documentation (this feature)

```text
specs/030-html-email-support/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   └── html-email-contract.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
frontend/
├── app/
│   ├── api/
│   │   └── messaging/
│   │       └── test/
│   │           └── route.ts             # CHANGED: EmailTestRequest gains
│   │                                     # `isHtml?: boolean`; passed through
│   │                                     # to sendEmailBatch (FR-007)
│   └── settings/
│       └── test-messaging/
│           └── MessagingTestForm.tsx    # CHANGED: email form gains a "Send
│                                        # as HTML" checkbox, included as
│                                        # `isHtml` in the POST body
│                                        # (User Story 3, FR-007)
├── lib/
│   ├── mcp-tools/
│   │   └── messagingTools.ts            # CHANGED: send_email's Zod
│   │                                     # inputSchema gains
│   │                                     # `isHtml: z.boolean().optional()`,
│   │                                     # passed to sendEmailBatch
│   │                                     # (FR-001, FR-005)
│   ├── messaging/
│   │   ├── sendEmail.ts                 # CHANGED: sendEmailBatch(to,
│   │   │                                 # subject, body, isHtml?) threads
│   │   │                                 # the flag through to
│   │   │                                 # sendEmailToRecipient (FR-001)
│   │   ├── email.ts                     # CHANGED: sendEmailToRecipient
│   │   │                                 # gains an `isHtml` parameter;
│   │   │                                 # when true, calls
│   │   │                                 # transport.sendMail with both
│   │   │                                 # `html` and a derived `text`
│   │   │                                 # (via html-to-text); when
│   │   │                                 # false/omitted, unchanged
│   │   │                                 # (FR-002, FR-003, FR-004,
│   │   │                                 # research.md §2, §3)
│   │   ├── config.ts                    # UNCHANGED
│   │   ├── errors.ts                    # UNCHANGED — no new error codes
│   │   ├── rateLimit.ts                 # UNCHANGED
│   │   ├── auditLog.ts                  # UNCHANGED
│   │   ├── store.ts                     # UNCHANGED
│   │   ├── validation.ts                # UNCHANGED
│   │   └── sendTelegram.ts              # UNCHANGED — this feature is
│   │                                    # email-only
│   └── i18n/dictionaries/*.ts           # CHANGED (all six languages): one
│                                        # new `settings.messagingTest.
│                                        # email.htmlToggle` string
├── package.json                         # CHANGED: adds `html-to-text`
│                                        # dependency (research.md §2)
└── package-lock.json                    # CHANGED: lockfile update from the
                                          # above
```

**Structure Decision**: Single Next.js project at `frontend/` (unchanged from spec 006). No new route, no new page, no new API endpoint — every change is an additive edit to files introduced by specs 017 and 029. The one new piece of infrastructure is the `html-to-text` dependency (research.md §2), used from a single call site (`lib/messaging/email.ts`).

## Complexity Tracking

Not applicable — Constitution Check recorded no violations (no ratified project principles exist yet to violate).
