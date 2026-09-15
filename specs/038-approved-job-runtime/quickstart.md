# Quickstart: Persistent Job Runtime

This guide validates one generic registered job end to end. Use an isolated Harnios S3 workspace; the current product decision permits authenticated clients to edit `os/`.

## Prerequisites

1. The frontend has its normal S3 configuration and is running.
2. `run_job` is enabled in the workspace tool configuration.
3. In an isolated workspace, create `os/jobs/example-transform/manifest.json` with id `example-transform`, version `1`, one `sourcePath` input limited to `data/in/` and `.txt`, fixed output `data/out/result.txt`, a 1 MB output limit, a 5-second timeout, and the allowed summary key `inputBytes`.
4. Create `os/jobs/example-transform/script.py` so it reads `Path(sourcePath)`, writes its uppercase content to `Path("data/out/result.txt")`, and returns `{ "inputBytes": <input byte count> }`.
5. Create `data/in/example.txt` containing `hello`.

## 1. Successful in-place transformation

Call `run_job` with the registered identifier and a permitted input argument.

Expected:

- An S3 file containing `HELLO` appears at the manifest's fixed output path.
- The result includes job id/version, output metadata, duration, and allowed summary values.
- The result does not include script stdout, input data, or output content.

## 2. Input-policy enforcement

Call the same job with a file outside its permitted prefix or extension.

Expected: `isError: true`, `code: "input_denied"`, and no output file is created or changed.

## 3. Virtual filesystem boundary

Temporarily use a test script that reads its authorized input and then tries each of: a sibling file, a host-style path, an environment value, and a network import/call.

Expected: the authorized read works; every other attempt fails as a denied filesystem operation or unsupported runtime behavior, without revealing protected content.

## 4. Staged-write safety

Seed the configured output path with known content. Use a test script that writes replacement output and then raises an exception.

Expected: `execution_failed`; reading the output path still returns its original known content.

## 5. Output limit

Use a script that stages more than the manifest output limit.

Expected: `output_too_large`; no new output is published.

## 6. Missing output

Use a script that returns a valid summary without writing `data/out/result.txt`.

Expected: `output_missing`; no output is published.

## 7. Malformed or missing artifact

Call an unknown identifier, then use a manifest with an invalid field.

Expected: `job_not_found` and `job_invalid` respectively, before source input is read.

## 8. Timeout and scheduling

Use a script that exceeds its manifest timeout, then configure an existing scheduled task to invoke the valid job.

Expected: the first returns `timeout`; the scheduled invocation has the same metadata-only completion shape as a live call.
