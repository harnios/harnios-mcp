# Data Model: Universal File Ingest

## Ingest request

| Field | Type | Rules |
|---|---|---|
| `file` | binary multipart part | Required; exactly one; allowed extension; maximum 25 MB. |

The client never selects a destination path.

## Ingested file

| Field | Type | Rules |
|---|---|---|
| `originalName` | string | Browser basename for display; separators and unsafe components are removed for storage naming. |
| `path` | string | `data/inbox/<uuid>-<sanitized-name>`; unique after success. |
| `size` | number | Exact accepted byte count. |
| `contentType` | string | Browser type when present, otherwise existing extension-derived type. |
| `lastModified` | timestamp | Storage publication time. |
| `etag` | string | Opaque storage version marker. |

Lifecycle: selected → validated → stored → result returned. Failure creates no successful result.

## Upload destination and job handoff

| Entity | Fields | Rules |
|---|---|---|
| Upload destination | `url`, `destinationPath`, `acceptedExtensions`, `maxBytes` | Absolute `/upload` URL and fixed `data/inbox/` destination. |
| Workflow input | `source_path` | User-selected inbox CSV, validated by the target job manifest. |
| Workflow result | existing run metadata | Output metadata and summary only; no source or output body. |
