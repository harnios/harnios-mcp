# Phase 0 Research: Send Email Messages in HTML

## §1. How to carry the HTML flag through the send path

**Decision**: Add a single optional boolean, `isHtml` (default `false`), threaded through every layer of the existing email send path — the `send_email` MCP tool's input schema, `sendEmailBatch()`, `sendEmailToRecipient()`, and the web test route's request body — rather than a `format: "text" | "html"` enum or a second `htmlBody` field alongside `body`.

**Rationale**: There are exactly two states (spec.md Assumptions: "the format flag is the source of truth, not content sniffing"), so a boolean is the smallest faithful representation — an enum adds a third representable-but-meaningless state (`"text"` explicitly vs. omitted) for no benefit. A second field (`htmlBody`) would mean two body fields to keep in sync and two things for a caller to reason about; a single `body` whose interpretation is switched by `isHtml` matches how the feature is described end-to-end ("send *this* content as HTML instead of plain text"), and keeps the existing `body: string` parameter meaning unchanged when `isHtml` is absent (FR-004's backward-compatibility requirement is then just "if the new field is missing, nothing about the old code path changes").

**Alternatives considered**: `format: "text" | "html"` enum — rejected as unnecessary ceremony for a two-state choice. Separate `htmlBody`/`textBody` fields — rejected because it re-introduces the exact "caller must author both" burden the spec's Assumptions explicitly opt out of (a plain-text fallback is *derived*, not authored) and complicates the common single-format case.

## §2. Deriving the plain-text fallback (FR-003)

**Decision**: Add the `html-to-text` npm package (a maintained, dependency-light HTML→plain-text converter used widely alongside `nodemailer` for exactly this purpose) and call its `convert()` function synchronously on the supplied HTML body whenever `isHtml` is true, passing the result as the message's `text` part alongside `html` as the message's `html` part.

**Rationale**: `nodemailer` (already a dependency, spec 017 research.md §1) accepts both `text` and `html` fields on `sendMail()` but does not generate one from the other — omitting `text` would violate FR-003 (recipients on non-HTML clients would see nothing readable). `html-to-text` uses a lenient HTML parser (`htmlparser2`), so malformed/unclosed markup degrades gracefully into a best-effort text rendering rather than throwing — directly satisfying FR-006 and Edge Case 3 (an invalid/unclosed tag must not block delivery). It also reasonably renders common structural elements (links show their href, list items get bullet/number prefixes, headings get line breaks) rather than just stripping tags to a run-on string, which is what "readable" in FR-003/SC-003 calls for.

**Alternatives considered**: A hand-rolled regex tag-stripper (`body.replace(/<[^>]*>/g, "")`) — rejected: it would leave `<a href="...">text</a>` as just `text` with the URL silently discarded (worse than "readable"), mishandle HTML entities (`&amp;`, `&nbsp;`), and be more fragile against malformed markup (Edge Case 3) than a parser-based approach, for no dependency savings that matters (the library is small and has no transitive footprint concerns beyond what `nodemailer` itself already carries). Requiring the caller to supply their own plain-text alternative — rejected per spec.md Assumptions, which explicitly chose the simpler single-body-authored-once shape.

## §3. Where `isHtml`/`html` flow into `nodemailer`

**Decision**: In `sendEmailToRecipient()`, when `isHtml` is true, call `transport.sendMail({ from, to, subject, html: body, text: htmlToText(body) })`; when false (or omitted), call it exactly as today: `transport.sendMail({ from, to, subject, text: body })` — no `html` field at all in the plain-text case.

**Rationale**: This is the literal mechanism behind FR-002/FR-003/FR-004: supplying only `text` (today's behavior) is untouched byte-for-byte when `isHtml` is falsy, so there is no code-path change — not even a conditional branch — for the plain-text case beyond the added (unused) parameter, which is the strongest possible form of "MUST NOT change the outcome of any existing plain-text send" (FR-004). `nodemailer` itself takes care of setting the correct MIME structure (`multipart/alternative` with both parts) when both `text` and `html` are given, which is exactly the "readable in both HTML and non-HTML clients" behavior FR-002/FR-003 ask for — no manual MIME construction needed.

**Alternatives considered**: Always deriving and sending both `text` and `html` (even for a plain-text send, wrapping the plain body in a trivial `<pre>` HTML envelope) — rejected as pure scope creep with no requirement asking for it, and it would change the MIME structure of every existing send (violating FR-004's spirit even if visually similar).

## §4. Where the `isHtml` toggle lives on the test page

**Decision**: A single checkbox ("Send as HTML") next to the existing email test form's body field (spec 029's `MessagingTestForm.tsx`), defaulting unchecked, sent as `isHtml` in the same JSON body the route already accepts. No separate "preview" pane.

**Rationale**: Matches spec.md User Story 3 / FR-007 exactly ("let the owner indicate whether their test email body is HTML or plain text, defaulting to the existing plain-text behavior") — the simplest possible control for a two-state choice, consistent with §1's boolean-flag decision carrying all the way to the UI. A preview pane (rendering the HTML client-side before sending) was considered but isn't asked for by any user story or requirement — the actual verification the user story cares about ("confirming a success result and a properly-rendered email in the target inbox", spec.md US3 Independent Test) happens by checking the real inbox, not a client-side preview; adding one would be speculative scope beyond what's specified.

**Alternatives considered**: A client-side HTML preview pane — rejected as unrequested scope (see above); can be revisited later if actually asked for.

## §5. Interaction with the existing rate limiter and audit log

**Decision**: No change. `checkAndRecordSend()` and `recordSendAttempt()` (spec 017, reused unchanged by spec 029/030) are called exactly as they are today — `isHtml` is not recorded as a new audit field, and does not affect rate-limit accounting.

**Rationale**: Nothing in spec 030's requirements asks for distinguishing HTML sends from plain-text sends in the audit trail or rate limit — FR-005 only requires the *capability* to be available through both entry points using the same underlying delivery behavior, not that the audit trail track which format was used. Keeping the audit record shape unchanged avoids a schema change for a distinction nothing downstream currently consumes.

**Alternatives considered**: Adding an `isHtml` field to the Send Attempt Record — rejected as unrequested scope; easy to add later (research.md-documented reversible decision) if a future feature needs to filter/report on it.
