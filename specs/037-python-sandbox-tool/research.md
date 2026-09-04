# Phase 0 Research: Run Python Scripts via MCP Tool

## §1. Sandbox engine choice

**Decision**: [Monty](https://github.com/pydantic/monty) (`@pydantic/monty`), an in-process, Rust-based sandboxed Python interpreter with a native TypeScript binding.

**Rationale**: harness-mcp deploys to both Vercel (serverless) and self-hosted Coolify (Docker), with no separate backend and no external infra beyond the S3 bucket. Monty runs as a library inside the Next.js process itself — no container/VM, no external account, no per-execution cost, no network dependency to a third-party service — so it behaves identically on both deploy targets by construction, not by extra integration work. Confirmed real and installable (`npm view @pydantic/monty` → latest `0.0.22`) and functionally verified with a manual spike in this repo (§3 below).

**Alternatives considered**:
- **E2B** — third-party cloud sandbox API, network-capable, real CPython + pip. Rejected: external paid service, per-execution cost, an additional vendor account/API key harness-mcp would need to hold regardless of which AI client calls the tool.
- **Vercel Sandbox** — native Vercel product (Firecracker microVMs). Rejected: tied to a Vercel account/billing even when reachable via API from elsewhere; doesn't fit a self-hosted Coolify deployment story as cleanly as a dependency-free library.
- **Anthropic's / Mistral's native code-execution tools** (`code_execution_20260521` server tool on the Messages API; Mistral's `code_interpreter` on its Agents/Conversations API) — rejected because they tie execution to a specific LLM vendor's account regardless of which AI client is actually calling the harness-mcp MCP tool (a ChatGPT- or Cursor-originated call would still need harness-mcp to hold, e.g., an Anthropic API key). Anthropic's variant additionally has zero network access with no override (confirmed via its live docs: "Internet access: Completely disabled for security... No outbound network requests permitted"), which — while compatible with this feature's own no-network v1 constraint (§ spec FR-008) — would still add an unnecessary vendor dependency for something Monty already does with none.

## §2. Native module deployment risk — resolved: switched to the WASM backend

**Update (post-deploy, 2026-09-04)**: The native backend (`@pydantic/monty`) failed on the real Coolify production host on every deploy attempt, with an error Monty itself misattributes to "npm has a bug related to optional dependencies" (npm/cli#4828). Regenerating the lockfile and later pinning the platform package as a direct (non-optional) dependency both failed identically — neither was the real cause. SSH access to the actual Coolify host plus a from-scratch reproduction in a plain `node:24-bookworm` container (same OS Coolify's Railpack build uses) surfaced the real underlying error, one level beneath Monty's misleading wrapper message:

```
Error: /lib/x86_64-linux-gnu/libc.so.6: version `GLIBC_2.38' not found (required by monty.linux-x64-gnu.node)
```

The precompiled `linux-x64-gnu` binary for `@pydantic/monty` versions 0.0.19 through 0.0.22 requires GLIBC >= 2.38; Debian Bookworm (Coolify's build base, confirmed via SSH: `ldd` reports GLIBC 2.36) is too old. Versions 0.0.15-0.0.18 load fine under 2.36, but expose a completely different, already-superseded synchronous/in-process API (no worker-pool, no subprocess crash isolation, errors returned rather than thrown) — downgrading would mean losing the crash-isolation story this engine was chosen for in the first place, not just a compatibility tweak.

**Fix**: switched to Monty's **WASM backend** (`@pydantic/monty/wasm` instead of `@pydantic/monty`) — deliberately kept API-identical to the native backend (same `Monty.create()` → pool → `checkout()` → `MontySession`, same `CollectString`, same `MontySyntaxError`/`MontyRuntimeError`/`MontyCrashedError` classes and messages) except that `Monty.create()` resolves to a `WorkerPool` rather than `Monty` itself being the pool — a one-line type change in `lib/python/sandbox.ts`, no logic change. WASM has no glibc dependency at all, sidestepping the whole class of problem rather than chasing a specific version. Verified exhaustively before considering this closed: same error taxonomy (syntax/runtime/timeout/memory-limit) reproduced correctly via a throwaway script inside the exact Bookworm container Coolify builds in; then the *actual* project — fresh `npm ci` + `npm run build` + `npm run start` with the boot-time smoke test (research.md's own T017) — run end-to-end in that same container, all green.

**Original diagnosis (superseded, kept for the record)**: The section below was written before the deploy failures and incorrectly treated this as a "verify before merging" checklist item rather than a live blocker. Left as-is for the historical decision trail; §2 above is the current state.

**Findings**:
- `@pydantic/monty` ships as a napi-rs Rust addon via `optionalDependencies`: `@pydantic/monty-{darwin-x64,darwin-arm64,linux-x64-gnu,linux-arm64-gnu,win32-x64-msvc}`. **There is no `linux-*-musl` build.**
- Verified locally (this repo, this session): `npm install @pydantic/monty` in `frontend/` resolved `@pydantic/monty-linux-x64-gnu` automatically and the package loaded and ran correctly under plain `node` (glibc-based dev environment).
- This repo has no committed `Dockerfile`; Coolify presumably builds via Nixpacks auto-detection for a Next.js app, which is Debian/glibc-based by default — but this is an assumption, not something verifiable from the repo alone. **Must be confirmed against the actual Coolify build configuration before this feature ships**, since an Alpine/musl base would make the native binary fail to load with no glibc build to fall back to.
- Vercel serverless bundling of a native addon is untested beyond a plain `node` run — this is the first native (napi) dependency in the project (everything else, e.g. `@aws-sdk/client-s3`, `nodemailer`, is pure JS). `serverExternalPackages` (Next 16's stable config key, successor to `experimental.serverComponentsExternalPackages`) should make Next's file-tracing include the right platform binary in the deployed function bundle, but this needs an actual `next build` and a Vercel preview-deploy smoke test — `next dev` behaves differently from build/trace for native modules and is not sufficient evidence on its own.

**Alternatives considered**: None — this is a verification task on the chosen engine, not a choice between engines. If the Coolify build turns out to be musl-based, the mitigation is to make the Coolify deployment glibc-based (e.g. via a committed Dockerfile using a Debian/glibc base image), not to switch sandbox engines, since Monty otherwise fits every other requirement uniquely well.

## §3. Python-subset limitations (empirically verified, not just documented)

**Decision**: Accept the subset as a hard constraint; make the tool's description proactively set expectations for callers.

**Findings** (verified two ways: against Monty's own docs/GitHub, and empirically run in this repo in a throwaway spike this session):
- No third-party packages — Monty has no `sys.path`/`site-packages` mechanism, so numpy/pandas/etc. are categorically unavailable, not merely "maybe unsupported."
- No class inheritance/metaclasses — empirically confirmed: `class Foo(Bar): pass` raises at run time with message `"NotImplementedError: The monty syntax parser does not yet support class inheritance and metaclasses"`.
- No generators, `match` statements, `del`, `async with`/`async for`, exception groups, PEP 695 type aliases, complex numbers, t-strings (per Monty's own docs).
- Plain (non-inheriting) classes and `async`/`await` for host-function calls do work.
- A genuine grammar-level syntax error (e.g. `def broken(:`) is empirically confirmed distinct from the above: it raises `MontySyntaxError`, not `MontyRuntimeError` (§6).

**Alternatives considered**: None — this is a fixed property of the chosen engine to design around (via clear tool description + error surfacing), not a decision point.

## §4. Resource limits vs. the platform's own request-time ceiling

**Decision**: Default `timeoutSeconds` = 5, caller-configurable up to a hard cap of 20; memory limit fixed (not caller-configurable in v1).

**Rationale**: `frontend/app/mcp/route.ts` sets `maxDuration: 60` for the whole MCP request on Vercel. `run_python`'s own timeout must leave real headroom under that ceiling once MCP transport overhead and (per the spike) Monty's own sub-10ms-scale sandbox-checkout time are accounted for — the sandbox startup cost itself is negligible relative to the caller-supplied script's own execution time. Memory is kept as a fixed, conservative default (tens of MB) rather than agent-configurable, so a single tool call can't pressure a shared serverless function's memory budget; only wall-clock is exposed as a caller-tunable input, matching spec FR-006's "sensible default and a small configurable ceiling."

**Alternatives considered**: Letting callers set memory/recursion limits too — rejected for v1 as unnecessary surface area; wall-clock is the dimension that actually matters for "did my script finish," and a fixed conservative memory ceiling is simpler to reason about for a shared serverless environment.

## §5. Testing approach

**Decision**: No automated test framework — manual `quickstart.md` verification only, per project instruction (do not run automated tests) and consistent with every prior spec in this repo (002, 011, 022 all state the same).

## §6. Error taxonomy — empirically verified, corrects an earlier assumption

**Decision**: Map errors by exception class first, then by message-prefix for the `MontyRuntimeError` case — not by exception class alone.

**Findings** (empirically run in this repo this session, not assumed from docs):
| Scenario | Exception class thrown | Message |
|---|---|---|
| Malformed grammar (e.g. `def broken(:`) | `MontySyntaxError` | `"SyntaxError: Expected a parameter or the end of the parameter list"` |
| Unsupported subset construct (e.g. class inheritance) | `MontyRuntimeError` | `"NotImplementedError: The monty syntax parser does not yet support class inheritance and metaclasses"` |
| Wall-clock limit exceeded | `MontyRuntimeError` | `"TimeoutError: time limit exceeded: 1.000043574s > 1s"` |
| A genuine Python runtime exception (e.g. division by zero) | `MontyRuntimeError` | `"ZeroDivisionError: division by zero"` |

This means **timeout, unsupported-subset, and ordinary runtime failures are not distinguishable by exception class alone** — all three surface as `MontyRuntimeError`. The error-mapping function (`mapMontyError()` in `lib/python/sandbox.ts`) must additionally inspect `err.message`'s leading token (`"TimeoutError:"` → `timeout`; anything else → `runtime_error`, with the underlying message passed through verbatim so a caller can still see e.g. `"NotImplementedError: ..."` and understand their script used an unsupported construct). Only `MontySyntaxError` maps directly and unambiguously to `syntax_error` by class.

**Update (implementation session, 2026-09-04)**: `memory_limit_exceeded` has now been empirically triggered — `pool.checkout({ limits: { maxMemory: 5_000_000 } })` followed by a script allocating a 50-million-element list throws `MontyRuntimeError` with `exception.typeName === "MemoryError"` and message `"MemoryError: memory limit exceeded: 800031671 bytes > 5000000 bytes"`. This is checked by `exception.typeName` rather than the message-prefix trick used for `timeout`, since Monty's own print-collector cap (`CollectString`, unused here — see below) raises the identically-worded message for a *different* reason (host-side stdout capping vs. real sandbox memory pressure), so typeName is the reliable discriminator, not message text. Also discovered while implementing: Monty's built-in `CollectString` print-target *throws* on exceeding its own cap rather than truncating (`dist/print.js`'s `checkPrintCollectLimit`), which would have made "the script printed a lot" indistinguishable from a real `memory_limit_exceeded` failure. `runPython()` therefore uses a plain callback with a manually bounded buffer instead, so stdout capping (FR-011) is always a truncated *success*, never routed through `mapMontyError()` at all. Also found: `MontyCrashedError` (a worker killed outright — segfault, OOM-kill, or the pool's own watchdog) is a case beyond the four `MontyError` subclasses originally enumerated; mapped to `timeout` when `err.timedOut` is true, else `sandbox_unavailable`.

**Alternatives considered**: Mapping by exception class alone (the original plan-mode assumption) — empirically falsified by the spike; documented here specifically so it is not re-assumed during implementation.

## §7. Script storage — reuse vs. new system

**Decision**: Reuse the existing S3-backed file storage unchanged; no new storage system.

**Rationale**: harness-mcp already has a single datastore (the bucket) and existing file tools (`create_file`, `read_file`, `update_file`) that handle arbitrary text files, plus a `/files` browser UI. A `.py` script is just another text file. `readFile()` in `frontend/lib/storage/files.ts` already returns `{ content: Buffer, ... }` and throws typed `StorageError`s (`not_found`, `type_mismatch`, `storage_unreachable`) that the existing `errorResult()` helper already handles — the `path` input case of `run_python` needs zero new storage code. `.py` is not currently in the browser-upload allow-list (`frontend/lib/storage/fileTypes.ts`'s `CATEGORY_EXTENSIONS`), but this only affects the drag-and-drop upload button and native in-browser rendering — it does not block `create_file`/`update_file` (used via MCP), which already accept any path/extension. Adding `.py` to that allow-list is an optional, separable follow-up, not required for this feature.

**Alternatives considered**: A dedicated "scripts" store or new file type — rejected as unnecessary; would duplicate what the bucket already does.
