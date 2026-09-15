# MCP Contract: `run_job`

## `run_job`

Runs a registered, persistent workflow from the Harnios S3 filesystem. The caller chooses only the workflow identifier and its declared arguments; it cannot submit code, script paths, or file permissions.

### Input

```ts
{
  jobId: string;
  args: Record<string, unknown>;
}
```

### Success output

```ts
{
  jobId: string;
  jobVersion: number;
  output: {
    path: string;
    size: number;
    contentType: string;
    etag: string;
  };
  durationMs: number;
  summary: Record<string, string | number | boolean | null>;
}
```

The response never includes script stdout, source records, input file contents, or generated output contents.

### Errors

Errors use MCP `isError: true` with one text item containing JSON:

```ts
{ code: string; message: string }
```

`code` is one of the `JobError` values in [data-model.md](../data-model.md), or the established storage error codes where an S3 operation itself fails.

### Availability

`run_job` is registered through the existing native-tool registration path, so it is available to both live MCP clients and scheduled tasks. The existing workspace-level toggle controls the whole tool; when disabled, it and all registered workflows are absent from tool discovery. Per-job disabling is out of scope for v1.

## Explicit exclusions

- No `code`, `path`, `filesystem`, timeout override, or caller-defined permission input exists.
- No host filesystem, environment, or network capability is available to a running job.
- In v1 a job publishes one output file per run.
