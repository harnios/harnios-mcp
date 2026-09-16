# Research: Universal File Ingest

## Dedicated authenticated multipart endpoint

**Decision**: Add a single-file inbox endpoint rather than extending the existing folder upload.

**Rationale**: Existing Harnios code already authenticates multipart requests, validates allowed types and a 25 MB limit, and writes raw bytes to S3. A dedicated endpoint adds an unambiguous inbox contract without changing folder-upload behavior.

**Alternatives considered**: Base64 through MCP was rejected because binary data enters the model/tool context. Direct S3 credentials or presigned writes were rejected for v1 because they duplicate validation and finalization. Reusing caller-selected folder upload was rejected because it can overwrite a same-name file.

## Server-generated inbox names

**Decision**: Store `data/inbox/<uuid>-<sanitized-basename>`.

**Rationale**: It preserves a recognizable name while guaranteeing unique stored paths and denying arbitrary caller-selected storage paths.

**Alternatives considered**: Original filename alone permits collisions; timestamp-only naming is not a durable identity; caller-provided paths weaken the inbox boundary.

## Configured absolute MCP link

**Decision**: Return `PUBLIC_APP_URL + /upload` from `get_upload_link`.

**Rationale**: MCP clients need an absolute browser URL that survives reverse proxies. A configured public origin avoids leaking internal Coolify/Next addresses.

**Alternatives considered**: Relative URLs may not resolve in every MCP client; request-origin inference is unsafe outside an HTTP request; provider-specific attachment bridges are deferred.

## Inbox CSV job handoff

**Decision**: Let the table job manifest accept `.csv` below `data/`.

**Rationale**: Its existing runtime validates one selected argument and maps only that path into Monty, so accepting the inbox needs no runtime redesign.

**Alternatives considered**: Moving the file before running adds a mutable step. Multiple manifest prefixes are deferred because one broader CSV prefix meets v1.
