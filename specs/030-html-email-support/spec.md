# Feature Specification: Send Email Messages in HTML

**Feature Branch**: `030-html-email-support`

**Created**: 2026-08-11

**Status**: Draft

**Input**: User description: "send email message in html"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Send a richly-formatted email (Priority: P1)

As someone sending an email through this system (directly, or via an AI assistant using the email tool), I want to provide HTML content for the body so the recipient sees proper formatting — headings, bold/italic text, links, lists, images — instead of raw markup or unformatted plain text.

**Why this priority**: This is the entire point of the request — today's email body is always sent as plain text, so any markup a caller supplies (e.g. an AI assistant asked to "send a nicely formatted email") shows up as literal angle-bracket tags in the recipient's inbox instead of rendering. This is the core capability being added.

**Independent Test**: Can be fully tested by sending one email with an HTML body (e.g. containing a heading, a bold phrase, and a link) to a real inbox and confirming it renders as formatted content, not raw markup — independent of every other scenario below.

**Acceptance Scenarios**:

1. **Given** a valid recipient, subject, and an HTML body, **When** the email is sent, **Then** the recipient's email client renders the formatting (headings, emphasis, links, lists) rather than showing HTML tags as text.
2. **Given** an HTML body, **When** the email is sent, **Then** the recipient's email client (including ones that don't render HTML, e.g. a plain-text mail reader) also shows a readable plain-text version of the same content, not a blank message or raw markup.
3. **Given** an HTML body containing an invalid/unclosed tag, **When** the email is sent, **Then** the message still sends and displays as reasonably as the recipient's email client can manage — malformed markup doesn't block delivery.

---

### User Story 2 - Existing plain-text sends are unaffected (Priority: P1)

As an existing caller of the email capability (an AI assistant or the web test page) that already sends plain-text bodies, I want those sends to keep working exactly as before, with no change in behavior, when I don't opt into HTML.

**Why this priority**: Equal priority to User Story 1 — this is a backward-compatibility guarantee, not an optional nicety. Breaking existing plain-text sends while adding HTML support would be a regression, not an enhancement.

**Independent Test**: Can be fully tested by sending an email exactly as done today (plain-text body, no format specified) and confirming the recipient sees the same plain, unformatted text as before this feature existed — independent of the HTML path.

**Acceptance Scenarios**:

1. **Given** a plain-text body with no HTML format specified, **When** the email is sent, **Then** it is delivered and displayed exactly as it would have been before this feature (no unexpected formatting, no literal markup artifacts, no behavior change).
2. **Given** a plain-text body that happens to contain characters like `<` or `>` (not intended as markup), **When** the email is sent without HTML specified, **Then** those characters appear literally in the recipient's inbox, unchanged from today's behavior.

---

### User Story 3 - Test an HTML email from the web interface (Priority: P2)

As the owner using the messaging test page (from the earlier "test messaging tools" feature), I want to compose and send a test email with HTML content and see it delivered, so I can verify HTML-formatted email works end to end without needing an AI assistant to trigger it.

**Why this priority**: Extends the existing test page rather than introducing new send capability — valuable for verifying this feature works, but the underlying capability (User Story 1) is what actually matters; the test page is a convenience on top of it.

**Independent Test**: Can be tested by opening the existing test-messaging page, choosing to send the test email as HTML, entering a body containing simple markup, submitting, and confirming a success result and a properly-rendered email in the target inbox — independent of testing via an AI assistant.

**Acceptance Scenarios**:

1. **Given** the owner is on the test-messaging page, **When** they indicate the test email body is HTML and submit, **Then** the recipient receives a properly-rendered HTML email, and the page shows the same success/failure outcome reporting as any other test send.
2. **Given** the owner leaves the format as plain text (the existing default), **When** they submit a test email, **Then** behavior is unchanged from before this feature.

---

### Edge Cases

- What happens when the HTML body is very large (e.g. embeds a large amount of markup)? The existing message-size/validation limits still apply; no new unbounded content is introduced.
- What happens when the HTML body contains a `<script>` tag or other active content? The email is still sent as authored — the sender (the owner or an AI assistant acting through the owner's configured account) is a trusted source composing their own outbound message, not untrusted content being rendered back to the sender, so no content is stripped or rejected. (Recipients' own email clients apply their own standard script-blocking behavior, as with any HTML email from any sender.)
- What happens when both a plain-text version and an HTML version could reasonably be shown, but the caller only provided HTML? A plain-text fallback is automatically derived from the HTML so non-HTML mail readers still show readable content (see Assumptions).
- What happens if the caller marks the body as HTML but the content has no markup at all (just plain sentences)? It's sent as HTML anyway — the format flag is the source of truth, not content sniffing; the recipient sees the same plain sentences either way since there's no markup to render differently.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST allow a caller sending an email to specify that the body content is HTML, in addition to the existing plain-text option.
- **FR-002**: When the body is marked as HTML, the system MUST deliver the email so that HTML-capable recipient email clients render the formatting rather than displaying raw markup.
- **FR-003**: When the body is marked as HTML, the system MUST also deliver a readable plain-text version of the same content, for recipients/clients that don't render HTML.
- **FR-004**: When no format is specified, the system MUST continue to send the body as plain text, identical to current behavior — this feature MUST NOT change the outcome of any existing plain-text send.
- **FR-005**: The HTML-sending capability MUST be available both to the programmatic email-sending capability (usable by an AI assistant) and to the web-based test-sending page, using the same underlying delivery behavior in both places (consistent with how the test page already reuses the same send logic as the programmatic tool).
- **FR-006**: The system MUST NOT reject or fail an otherwise-valid send solely because the supplied HTML is malformed (e.g. unclosed tags) — delivery proceeds on a best-effort rendering basis, same as how any email client handles imperfect HTML.
- **FR-007**: The web-based test-sending page MUST let the owner indicate whether their test email body is HTML or plain text, defaulting to the existing plain-text behavior when not changed.

### Key Entities

- **Email Send Request**: Extends the existing email send request (recipient(s), subject, body) with a body format indicator (plain text — the default — or HTML). No new entity is introduced; this is an added attribute on the existing request shape used by both the programmatic tool and the test page.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An HTML-formatted test email sent through either entry point (the programmatic tool or the web test page) renders with visible formatting (not raw tags) in a standard email client, verified on the first attempt.
- **SC-002**: 100% of existing plain-text send behavior is unchanged after this feature ships — no plain-text email sent without an HTML flag differs in appearance from before this feature existed.
- **SC-003**: A recipient using a plain-text-only mail reader can still read the full intended message content (not blank, not raw markup) when sent an HTML email under this feature.

## Assumptions

- "HTML" means the caller supplies a body that is itself HTML markup (headings, emphasis, links, lists, etc.) — there is no separate rich-text/Markdown-to-HTML conversion step; that's a different feature if ever wanted.
- The plain-text fallback required by FR-003 is derived automatically from the supplied HTML (e.g. by stripping markup down to readable text) rather than requiring the caller to separately author both a plain-text and an HTML version of the same message — keeping the capability simple to use.
- No sanitization or content restriction is applied to the HTML body beyond what already exists for the plain-text path today (e.g. existing length limits) — the sender is a trusted source (the owner or an AI assistant acting on the owner's configured account) composing their own outbound message, not the kind of untrusted/uploaded content spec 028 guards against.
- This feature only concerns the outbound email capability (spec 017/029) — it has no relationship to and does not change how HTML files are handled in the file storage/browser feature (specs 003, 028), which is about untrusted stored content and remains unaffected.
- Embedding remote images by URL in the HTML is supported implicitly (it's just an `<img src="...">` tag); attaching/embedding local image files as part of the email is out of scope for this feature.
