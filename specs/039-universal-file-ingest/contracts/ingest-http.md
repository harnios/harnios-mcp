# HTTP Contract: `POST /api/ingest`

## Authentication

Requires the existing owner browser session or `Authorization: Bearer <OAuth-or-PAT>`. Unauthenticated requests return the established `401` error and publish nothing.

## Request

`multipart/form-data` with exactly one `file` part. No destination-path field is accepted.

## Success

HTTP `201`:

```ts
{ originalName: string; path: string; size: number; contentType: string; lastModified: string; etag: string }
```

`path` is unique under `data/inbox/`; the response contains no file body.

## Errors

The existing `{ code, message }` JSON shape applies: `400 invalid_request` for zero/multiple/non-file parts, `415 unsupported_type`, `413 too_large`, `401 unauthorized`, and established storage errors. No failure response includes a path.

## Compatibility

`POST /api/upload` remains the existing multi-file caller-selected-folder endpoint.
