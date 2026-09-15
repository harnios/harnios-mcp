# Research: Persistent Job Runtime

## 1. Sandboxed S3-backed filesystem

**Decision**: Use Monty's `os` callback for a per-run virtual filesystem backed by existing S3 storage functions.

**Rationale**: The application runs Monty's WASM backend. That backend intentionally rejects host-directory mounts, while `feedRun` accepts an `os` callback that may return promises. It can therefore broker each filesystem operation through application code without granting host access. The callback sees normalized virtual absolute paths; map `/data/report.csv` to S3 key `data/report.csv`, never to a host path. Relative Python paths resolve from the virtual root.

**Alternatives considered**:

- `MountDir` — rejected because it is unavailable in the WASM backend and would expose a host directory.
- Passing file contents in `args` — rejected because it transfers data through the tool/model boundary and does not support natural file-oriented scripts.
- Giving the script S3 credentials or a host function — rejected because it would bypass per-path policy and expose network capability.

## 2. Job artifact layout and trust model

**Decision**: Resolve a job only from `os/jobs/<jobId>/manifest.json` and `os/jobs/<jobId>/script.py`; an optional `skill.md` is a persistent instruction artifact for agents but is not executed.

**Rationale**: The layout makes every artifact visible and portable through the single Harnios S3 filesystem. A narrow job-id validator prevents traversal and avoids treating arbitrary S3 files as executable. The manifest is validated afresh for every run before its script or input is read.

**Current risk accepted by product decision**: Any authenticated MCP client may edit `os/`. Consequently this version guarantees that a *run request* cannot alter its resolved manifest or permissions, but does not guarantee the manifest was created by a trusted principal. Do not describe the feature as an approval boundary until `os/` write protection is added.

## 3. Permission policy

**Decision**: Each v1 manifest has one path-valued input argument constrained by a declared S3-prefix-and-extension policy and one fixed output file path. The runtime maps the validated S3 input value to a normalized virtual absolute path before binding it for the script. The virtual filesystem exposes only that resolved input path for reading and fixed output path for writing.

**Rationale**: This supports reusable jobs without letting the caller submit arbitrary read/write lists. Exact virtual-path matching prevents prefix confusion such as allowing `data/a` and reaching `data/archive/a`. An operation outside the two resolved paths returns Monty's normal permission failure and never reveals S3 existence or contents.

**Alternatives considered**:

- Caller-provided `filesystem.read` / `filesystem.write` lists — rejected: callers could expand a job's authority.
- Arbitrary globbed read/write access in v1 — deferred: it complicates directory enumeration, collision semantics, and safe publication without serving the minimal universal job contract.

## 4. Staged output and atomic publication

**Decision**: Keep virtual writes in a bounded in-memory overlay, let the script read its own staged writes, require it to stage the manifest's single output, and publish that output with one S3 object write only after the sandbox completes successfully.

**Rationale**: Writing through during execution could leave a broken or partial result when a script fails. A single object replacement becomes visible only after the completed object write, so the old output remains intact when the script errors or exceeds its resource limit. The output byte limit is applied before publication.

**Alternatives considered**:

- Write-through callback — rejected due to partial files on failure.
- Temporary-object plus rename — S3 has no atomic rename; copy/delete adds complexity and does not make a multi-output transaction atomic.
- Multiple outputs per run — deferred. A job can produce one archive or structured file in v1; multi-object transaction semantics require a later design.

## 5. Error and result contract

**Decision**: Introduce `JobError` with distinct codes and return only output metadata plus manifest-approved aggregate summaries. Storage errors retain the existing storage error convention where they identify an underlying S3 failure.

**Rationale**: Models need enough structured information to retry or correct a call, but should not receive source records or generated contents. Separating invalid job configuration, denied virtual path, input validation, sandbox failure, and publication failure makes operation diagnosable without leaking protected data.

## 6. Existing integration points

**Decision**: Register `run_job` through `registerNativeTools`, like `run_python`.

**Rationale**: This makes the same tool available to live MCP sessions and scheduled tasks, with existing workspace-level tool toggles. Add it to `TOOL_CATALOG` under a new `Jobs` group and use `registerGatedTool` so disabled jobs are unavailable from tool discovery.

## 7. Verification approach

**Decision**: Add unit-level coverage only if the repository gains a harness; for this feature's current convention, use the manual quickstart and an in-process MCP smoke test.

**Rationale**: Existing specs explicitly use manual testing. The critical proof cases are allowed read, allowed staged write and publication, denied read/write, malformed manifest, sandbox timeout, output-size rejection, and scheduler availability.
