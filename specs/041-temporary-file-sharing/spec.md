# Feature Specification: Temporary File Sharing

**Feature Branch**: `041-temporary-file-sharing`
**Created**: 2026-09-18
**Status**: Draft
**Input**: User description: "Aggiungere la possibilità di condividere temporaneamente un file e aprirlo nel browser invece di scaricarlo"

## Clarifications

### Session 2026-09-18

- Q: Quale durata massima deve essere consentita per un link temporaneo? → A: Massimo 30 giorni, con durate suggerite di 1 ora, 1 giorno, 7 giorni e 30 giorni.
- Q: Deve essere possibile proteggere un link condiviso anche con una password? → A: Sì, con password opzionale scelta dal proprietario.
- Q: Per i formati che il browser non riesce a visualizzare, vuoi comunque offrire un pulsante opzionale per scaricare il file? → A: Sì, mostrare una pagina informativa con download opzionale, senza download automatico.

## User Scenarios & Testing

### User Story 1 - Create a temporary browser-view link (Priority: P1)

As the owner, I want to create a temporary link for a file so that another person can open it in a browser without signing in.

**Why this priority**: This is the primary value of the feature: sharing a file for a limited time while keeping the normal file area protected.

**Independent Test**: Sign in as the owner, create a share for a viewable file with an expiration, open the generated link in a signed-out browser, and verify that the file is displayed inline.

**Acceptance Scenarios**:

1. **Given** an existing file and an authenticated owner, **When** the owner creates a temporary share with an expiration, **Then** the system returns a unique share link and shows its expiration time.
2. **Given** a valid, unexpired share link, **When** an unauthenticated visitor opens it, **Then** the file is presented in the browser without requiring an owner login.
3. **Given** a valid share link, **When** the visitor attempts to edit, rename, delete, or browse outside the shared file, **Then** the system provides no write or additional-file access.
4. **Given** a share protected by a password, **When** a visitor opens the link, **Then** the system requests the password before displaying the file and does not reveal the file content for an incorrect password.

### User Story 2 - Revoke or let a share expire (Priority: P1)

As the owner, I want a shared link to stop working when it expires or when I revoke it, so that temporary access remains under my control.

**Why this priority**: A temporary link is only useful if access can reliably end.

**Independent Test**: Create a share, revoke it before its expiration, and verify that the link no longer displays the file; repeat with an expired share.

**Acceptance Scenarios**:

1. **Given** an active share, **When** the owner revokes it, **Then** subsequent visits show that the link is no longer available.
2. **Given** an expired share, **When** a visitor opens the link, **Then** the file is not displayed and the visitor receives a clear expired-link message.
3. **Given** a revoked or expired share, **When** the original file is still present, **Then** the owner can access it normally through the authenticated file area.

### User Story 3 - View supported and unsupported file types safely (Priority: P2)

As a visitor, I want the shared file to open in the browser when the browser supports its format, with a clear fallback when it does not.

**Why this priority**: The requested experience is browser viewing, but not every file format can be rendered by a browser.

**Independent Test**: Share a PDF, image, and text file, then share a format that browsers typically cannot render, and verify the expected viewing or fallback behavior for each.

**Acceptance Scenarios**:

1. **Given** a shared PDF, image, audio, video, or text file, **When** a visitor opens the link, **Then** the browser attempts to display or play the content inline.
2. **Given** a shared Markdown file, **When** a visitor opens the link, **Then** the system displays a safe browser view without executing embedded scripts or unsafe markup.
3. **Given** a shared format that the browser cannot render, **When** a visitor opens the link, **Then** the system shows a clear preview-unavailable message and offers a download action where appropriate.
4. **Given** a missing, moved, or deleted original file, **When** a visitor opens its share link, **Then** the system does not expose storage details and shows that the file is unavailable.

## Edge Cases

- The owner attempts to create a share for a file that does not exist or is no longer accessible.
- The owner supplies an expiration in the past or beyond the allowed maximum.
- A visitor uses an invalid, malformed, or guessed share token.
- The same share link is opened concurrently by multiple visitors.
- The file is replaced after the share is created; the share follows the selected file path and always enforces the current owner access rules.
- The file is large or slow to load; the visitor receives a normal loading/error experience without a server error page exposing internal details.
- A file has an unsafe or misleading filename or media type; the browser view must not enable script execution from the shared content.
- The share URL is copied into a referrer, browser history, or access log; the token must be treated as a bearer secret and must not reveal the file path.

## Requirements

### Functional Requirements

- **FR-001**: The system MUST allow an authenticated owner to create a temporary share for one existing file.
- **FR-002**: The system MUST require every share to have an expiration time, MUST reject an expiration that is already in the past, and MUST reject an expiration more than 30 days after creation.
- **FR-003**: The system MUST generate a unique, unguessable share link that does not expose the storage path or owner credentials, and MUST allow the owner to optionally require a password.
- **FR-004**: The system MUST allow an unauthenticated visitor with a valid share link to view only the associated file, after validating the optional share password when one is configured.
- **FR-005**: The system MUST present browser-supported content inline rather than forcing a download.
- **FR-006**: The system MUST identify the content type safely and MUST prevent shared content from executing scripts in the visitor's browser.
- **FR-007**: The system MUST provide a clear fallback for formats that cannot be rendered inline, including a download action when the file type is eligible for download.
- **FR-008**: The system MUST deny access after the share expires, including on a request made using a previously valid link.
- **FR-009**: The system MUST allow the owner to revoke an active share before its expiration.
- **FR-010**: The system MUST deny access to a revoked share immediately on subsequent requests.
- **FR-011**: The system MUST show clear, non-sensitive error states for invalid, expired, revoked, unavailable, and unsupported shares.
- **FR-012**: The system MUST prevent a shared visitor from listing directories or accessing any file other than the one associated with the share.
- **FR-013**: The system MUST prevent a shared visitor from editing, deleting, moving, or replacing the associated file.
- **FR-014**: The system MUST provide the owner with a way to see active shares and their expiration status, and to revoke them.
- **FR-015**: The system MUST record enough share metadata to support expiration, revocation, and operational troubleshooting without storing the raw bearer token in a user-visible listing.

### Key Entities

- **Temporary share**: A read-only permission granting access to one file until a specified expiration or until revoked; includes its associated file reference, creation time, expiration time, status, optional password protection, and access metadata.
- **Share link**: The visitor-facing URL containing an unguessable bearer token that identifies a temporary share without revealing the file path.
- **Shared file view**: The browser-facing representation of a file, either inline content or a safe unsupported-format fallback.

## Success Criteria

### Measurable Outcomes

- **SC-001**: An owner can create and copy a temporary share link for an existing file in under 30 seconds.
- **SC-002**: At least 95% of valid shares for browser-supported formats open the file in the browser on the first attempt without requiring visitor authentication.
- **SC-003**: 100% of requests made after expiration or revocation are denied access to the shared file.
- **SC-004**: A visitor with a valid share can access exactly one file and cannot perform any write operation or access a neighboring file.
- **SC-005**: Unsupported formats produce a clear fallback experience rather than a blank page or an unhandled application error.
- **SC-006**: No shared link exposes the owner's credentials, storage path, or the contents of any unrelated file.

## Assumptions

- Sharing is read-only in the first version; editing through a public link is out of scope.
- The owner is the only role allowed to create, list, and revoke shares.
- Sharing one file is in scope; sharing folders or generating ZIP archives is out of scope for the first version.
- A share link is a bearer credential: anyone who possesses it can view the file until it expires or is revoked.
- The owner may optionally add a password to provide a second protection layer for sensitive shares.
- Expiration is mandatory, with a maximum duration of 30 days; the suggested durations are 1 hour, 1 day, 7 days, and 30 days.
- Browser viewing is best effort and depends on the visitor's browser support for the file format.
- Unsupported formats show a preview-unavailable message with an optional download action; no file is downloaded automatically.
- Existing owner authentication and file access rules remain the source of truth for owner operations.
- The feature must work with the application's existing S3-compatible storage backends without requiring a separate database service.
- No Git commit or remote push is performed as part of this feature.
