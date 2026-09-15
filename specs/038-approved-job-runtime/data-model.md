# Data Model: Persistent Job Runtime

## S3 artifact layout

```text
os/
├── jobs/
│   └── <jobId>/
│       ├── manifest.json
│       ├── script.py
│       └── skill.md             # optional, never executed
└── skills/                      # optional standalone persistent instructions
```

`jobId` is lowercase letters, digits, and hyphens; it cannot contain a slash, dot segment, or whitespace. It maps to one exact artifact directory.

## JobManifest

| Field | Type | Rules |
|---|---|---|
| `id` | string | Must equal the requested `jobId`. |
| `version` | positive integer | Returned as metadata for traceability. |
| `title` | string | Human-readable label. |
| `input` | object | Defines one required path argument: its name, permitted S3 prefix, and permitted extensions. |
| `output` | object | Defines one fixed S3 file path and maximum byte size. |
| `timeoutSeconds` | integer | 1–20 seconds. |
| `summary` | string array | Names of aggregate result fields the script may return. |

The manifest does not contain host paths, credentials, network settings, arbitrary callback names, or caller-selected permission lists.

## RunJobRequest

| Field | Type | Rules |
|---|---|---|
| `jobId` | string | Required registered identifier. |
| `args` | object | Required job-defined inputs. The v1 contract accepts the manifest's one S3 path argument and optional JSON-safe scalar settings declared by the manifest. The runtime validates the S3 path then replaces that argument passed to the script with its normalized virtual absolute path. |

## Virtual filesystem state

| Field | Description |
|---|---|
| `readPath` | One normalized virtual path backed by the resolved, authorized S3 input file. |
| `writePath` | One normalized virtual path backed by the fixed output S3 file. |
| `overlay` | In-memory content written by the script, invisible outside the run until publication. |
| `outputLimitBytes` | Upper bound checked for every write and before publication. |

Only `readPath` may be read. Only `writePath` may be written. A write path may be read back from `overlay` by the same run. Directory enumeration, rename, deletion, environment access, and every unmatched virtual path are denied in v1.

The caller never controls a virtual path directly. For example, a permitted caller argument `data/in/report.csv` is made available to the script as `/data/in/report.csv`; this is the only path form a script receives for its selected input.

## RunJobResult

| Field | Type | Notes |
|---|---|---|
| `jobId` | string | Resolved job identifier. |
| `jobVersion` | number | Manifest version used. |
| `output` | object | `{ path, size, contentType, etag }` from the published S3 object. |
| `durationMs` | number | Wall-clock execution time. |
| `summary` | record | Only manifest-approved aggregate values. |

`stdout`, script result values, input contents, and output contents are not returned by `run_job`.

## JobError

| Code | Meaning |
|---|---|
| `invalid_input` | Missing or invalid `jobId`/arguments. |
| `job_not_found` | No manifest or script exists for the identifier. |
| `job_invalid` | Persisted manifest or script is invalid for execution. |
| `input_denied` | Input argument is outside the manifest policy. |
| `filesystem_denied` | Script attempted a non-authorized virtual operation. |
| `execution_failed` | Script failed, including unsupported Python. |
| `timeout` | Execution exceeded the manifest limit. |
| `output_too_large` | Staged output exceeded the manifest limit. |
| `output_missing` | Script completed without staging the manifest's required output. |
| `publish_failed` | Script completed but output could not be published. |

Existing `StorageError` values remain available for underlying S3 availability and type failures where appropriate.

## Flow

```text
run_job(jobId, args)
  → validate jobId
  → read + validate os/jobs/<jobId>/manifest.json and script.py
  → validate args against manifest input policy
  → create empty virtual filesystem overlay
  → execute sandbox with persisted script + virtual filesystem and virtualized path argument
  → require staged output; validate summary + staged output size
  → publish exactly one output object
  → return RunJobResult metadata only
```
