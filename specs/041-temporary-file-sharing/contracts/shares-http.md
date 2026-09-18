# Temporary File Sharing HTTP Contracts

All owner routes require the existing owner session or bearer-token guard. Public share routes do not require owner authentication, but they require a valid bearer token and, when configured, a valid visitor access cookie.

## Create share

`POST /api/shares`

Request JSON:

```json
{
  "path": "reports/q3.pdf",
  "expiresAt": "2026-09-25T12:00:00.000Z",
  "password": "optional secret"
}
```

Rules:

- `path` must identify an existing file accessible to the owner.
- `expiresAt` must be in the future and no more than 30 days after creation.
- `password` is optional; it must not be echoed in any response or log.

Success `201`:

```json
{
  "id": "share-id",
  "path": "reports/q3.pdf",
  "url": "https://example.test/share/<raw-token>",
  "expiresAt": "2026-09-25T12:00:00.000Z",
  "passwordProtected": true,
  "status": "active"
}
```

The raw URL token is returned on creation so the owner can copy it. It is not returned by later list operations.

## List shares

`GET /api/shares`

Success `200` returns an array of owner-safe summaries:

```json
[
  {
    "id": "share-id",
    "path": "reports/q3.pdf",
    "expiresAt": "2026-09-25T12:00:00.000Z",
    "status": "active",
    "passwordProtected": true,
    "accessCount": 2,
    "lastAccessedAt": "2026-09-18T14:00:00.000Z"
  }
]
```

## Revoke share

`DELETE /api/shares?id=<share-id>`

Success `204` marks the share revoked. Repeating the operation for an already revoked or unknown id returns a non-sensitive not-found response according to the project’s existing route conventions.

## Public share page

`GET /share/<raw-token>`

Returns a browser page representing one of these states:

- active, unprotected: preview shell for the associated file;
- active, password-protected: password form without file content;
- expired, revoked, invalid, or unavailable: non-sensitive error page;
- unsupported type: preview-unavailable page with an explicit optional download action.

The route must not expose the normalized storage path in an error for an invalid or unavailable token.

## Verify share password

`POST /share/<raw-token>/verify`

Request body:

```json
{ "password": "secret" }
```

On success, the route sets the scoped visitor access cookie and redirects back to the share page. Incorrect passwords return a generic failure without revealing whether the file exists beyond the valid share page context. Expired, revoked, and invalid shares do not proceed to password verification.

## Public content

`GET /share/<raw-token>/content`

Authorization:

- unprotected active share: raw token is sufficient;
- password-protected active share: valid scoped visitor access cookie is also required.

The response is one of:

- safe inline content with a validated safe content type and `Content-Disposition: inline`;
- a safe text/Markdown view response that cannot execute stored scripts;
- a non-sensitive error page/response for invalid, expired, revoked, unavailable, or unauthorized access.

## Optional download

`GET /share/<raw-token>/download`

Uses the same share authorization as the content route. It is linked only from the unsupported-format page and returns the file as an inert attachment with `X-Content-Type-Options: nosniff`; it is never an automatic redirect from the main share URL.

## Error classes

The public UI may distinguish `expired`, `revoked`, `invalid`, `password_required`, `password_invalid`, `unavailable`, and `unsupported`, but must not include S3 keys, credentials, stack traces, or unrelated file information.

