# Quickstart: Validate Universal File Ingest

## Prerequisites

- Harnios is deployed with S3 and normal owner authentication.
- `PUBLIC_APP_URL` is the external Harnios origin without a trailing slash.
- The table-job manifest accepts `.csv` under `data/`.
- Prepare a valid CSV under 25 MB and an invalid test file.

## Browser flow

1. Sign in and open the URL returned by `get_upload_link`.
2. Upload the CSV; verify one success result with a unique `data/inbox/` path, type, and size.
3. Upload the same filename again; verify a different path.
4. Try an invalid and an over-limit file; verify clear errors and no successful path.

## MCP and job flow

1. From an authenticated MCP client call `get_upload_link`; verify URL, destination, allowed extensions, and limit.
2. Pass the returned inbox CSV path as `source_path` to the table job's `run_job` call.
3. Verify output metadata/summary only, then open the resulting HTML path in Harnios.
4. Confirm the CSV is never read into the conversation.
5. Temporarily remove `PUBLIC_APP_URL` and verify `get_upload_link` returns `configuration_error` rather than an internal URL.
6. Place two CSVs in the inbox and verify the assistant asks which path to use instead of guessing.

## Regression

1. Use the existing Files editor to upload multiple files to an arbitrary folder; existing per-file results and overwrite behavior remain unchanged.
2. Run `cd frontend && npm run build`.
