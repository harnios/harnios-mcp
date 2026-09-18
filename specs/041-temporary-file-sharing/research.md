# Research: Temporary File Sharing

## Decision 1: Validate public access through the application

**Decision**: Public share links are handled by application routes that validate the share record before returning a browser view or file content. Do not expose a long-lived direct S3 URL as the share link.

**Rationale**: The feature requires immediate revocation, optional passwords, strict one-file scope, safe content headers, and user-friendly error pages. A direct presigned S3 URL cannot reliably enforce a revocation that occurs after the URL is issued. The application can still stream or return the bounded file content using the existing 25 MB limit.

**Alternatives considered**:

- Direct presigned S3 URL: simpler and cheaper per request, but password handling and immediate revocation are weaker and already-issued URLs remain usable.
- Authenticated guest accounts: stronger identity, but unnecessary friction for temporary one-off viewing and outside the first-version scope.

## Decision 2: Store share metadata as reserved S3 JSON records

**Decision**: Store one JSON record per share under `.shares/<share-id>.json`; exclude `.shares/` from the file explorer and MCP filesystem listings. List records by prefix for the owner management view.

**Rationale**: The application already treats the S3 bucket as its datastore and uses reserved JSON prefixes for OAuth, messaging, scheduler, and external-MCP state. This preserves serverless portability and avoids introducing a database service.

**Alternatives considered**:

- A relational database: unnecessary operational dependency for one-owner storage and inconsistent with the current architecture.
- Encoding all state in the URL: cannot support revocation, owner listings, or password metadata safely.

## Decision 3: Hash both bearer tokens and optional passwords

**Decision**: Generate a cryptographically random bearer token and return the raw token only in the creation response. Persist only a one-way token digest. For optional passwords, persist a salted password hash and verify it server-side without returning or logging the password.

**Rationale**: A bucket read or metadata listing must not expose usable share credentials. Token comparison must use a fixed representation, and password verification must use a password-specific slow hash rather than a plain digest.

**Alternatives considered**:

- Persisting raw tokens: makes a storage read equivalent to access to every active share.
- Persisting plain or fast-hashed passwords: unsafe if the bucket contents are disclosed.

## Decision 4: Use a short-lived signed visitor access cookie after password verification

**Decision**: For password-protected shares, verify the password through a POST action and issue a short-lived, HTTP-only, same-site cookie scoped to the share route. The cookie binds the share identifier and expiration; every content request still checks the share's current active/revoked state.

**Rationale**: The password must not appear in the URL or be repeatedly submitted in a query string. A signed cookie avoids a database-backed visitor session while preserving immediate revocation checks.

**Alternatives considered**:

- Password in the URL: leaks through browser history, referrers, and logs.
- Long-lived server-side visitor sessions: adds state and cleanup requirements without improving the core owner-controlled revocation model.

## Decision 5: Separate public preview page from protected content response

**Decision**: `/share/<token>` renders the public state, password form, error state, or preview shell. A protected content route supplies the file bytes only after the share checks pass. The preview shell selects safe inline rendering, a safe text/Markdown view, or an optional download action.

**Rationale**: A page shell can give consistent loading, unsupported-format, expired, revoked, and password states. It also avoids serving HTML-family files as executable documents. The content response can use strict `Content-Type`, `Content-Disposition`, `X-Content-Type-Options`, and framing policy headers.

**Alternatives considered**:

- Return raw bytes directly from the public route: does not provide a consistent unsupported-format or password UX.
- Serve every stored MIME type inline: creates stored-XSS risk for HTML/XML-family content.

## Decision 6: Inline policy is allow-listed by content category

**Decision**: Inline rendering is allowed for PDF, images, audio/video, and non-executable text views. Markdown is rendered through the existing safe Markdown path without raw HTML or script execution. HTML/XML-family, office, spreadsheet, archive, and unknown binary formats use an unavailable-preview page with an explicit optional download action; no format is downloaded automatically.

**Rationale**: Browser MIME handling is not a security boundary for user-uploaded content. The existing file type module already distinguishes renderable and downloadable categories; the share policy should be stricter than trusting stored metadata.

**Alternatives considered**:

- Trust the object's stored `ContentType`: unsafe when metadata is missing or misleading.
- Inline HTML/XML: risks active content execution in the origin's security context.

## Decision 7: Apply existing file path and size rules at access time

**Decision**: A share stores the normalized file path, not a byte snapshot. Each public request checks the current share and reads the current object at that path, so deleting or moving the object makes the share unavailable and replacing the object updates what the share displays.

**Rationale**: This matches the clarified specification, avoids duplicating file bytes, and keeps sharing compatible with existing S3 lifecycle operations. The current upload/file limits remain the practical maximum for buffered public viewing.

**Alternatives considered**:

- Snapshot the file at share creation: adds storage duplication and a new lifecycle without a stated user need.

