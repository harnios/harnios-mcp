# Quickstart: Run Python Scripts via MCP Tool

**Input**: [spec.md](./spec.md), [contracts/mcp-tools-python.md](./contracts/mcp-tools-python.md)

This guide validates the feature end-to-end against the acceptance scenarios in spec.md. It assumes `run_python` has been implemented per tasks.md, and that the existing S3 storage MCP server (spec 002) is already running.

## Prerequisites

1. The spec 001 local storage stack is running: from the repo root, `docker compose up -d`.
2. Dependencies installed: `cd frontend && npm install` (installs the pinned `@pydantic/monty`).
3. The MCP server's dev server running: `npm run dev` (Next.js on `http://localhost:3000` by default).
4. An MCP client capable of connecting over Streamable HTTP, pointed at `http://localhost:3000/mcp`.

## 1. Run inline code (validates User Story 1, FR-001–FR-002, FR-005–FR-006, SC-001)

Call `run_python` with:
```json
{ "code": "x = 1 + 2\nprint('hello, x =', x)\nx * 10" }
```

Expected: `stdout` contains `"hello, x = 3"`, `result` is `30`, `stdoutTruncated` is `false`, `source` is `"inline"`.

Call `run_python` with:
```json
{ "code": "print('n squared is', n * n)", "args": { "n": 6 } }
```

Expected: `stdout` contains `"n squared is 36"` — `args` reached the script without being written into the source text (FR-005).

## 2. Run a saved script by reference (validates User Story 2, FR-003, SC-002)

Use the existing `create_file` tool to save a script:
```json
{ "path": "demo/scripts/greet.py", "content": "print('hello from a saved script')\n42" }
```

Call `run_python` with:
```json
{ "path": "demo/scripts/greet.py" }
```

Expected: `stdout` contains `"hello from a saved script"`, `result` is `42`, `source` is `{ "path": "demo/scripts/greet.py" }`.

Use `update_file` to change the saved script's content, then call `run_python` with the same `path` again.

Expected: the run reflects the newly saved content, not the original (spec User Story 2, Acceptance Scenario 2).

Call `run_python` with `{ "path": "demo/scripts/does-not-exist.py" }`.

Expected: the same `not_found` error shape `read_file` already gives for a missing path (contracts/mcp-tools-python.md).

## 3. Input validation (validates FR-004)

Call `run_python` with `{}` (neither `code` nor `path`).

Expected: `isError: true`, `{ code: "invalid_input", ... }`.

Call `run_python` with both `{ "code": "1", "path": "demo/scripts/greet.py" }`.

Expected: the same `invalid_input` error.

## 4. Distinct failure categories (validates FR-007, SC-005)

Call `run_python` with `{ "code": "def broken(:\n    pass\n" }` (malformed syntax).

Expected: `{ code: "syntax_error", ... }`.

Call `run_python` with `{ "code": "1/0" }` (a script that parses but fails while running).

Expected: `{ code: "runtime_error", ... }`, message mentions `ZeroDivisionError`.

Call `run_python` with `{ "code": "class Foo(Bar):\n    pass\n" }` (a construct outside the supported subset).

Expected: `{ code: "runtime_error", ... }`, message mentions the sandbox doesn't support class inheritance — distinguishable from the ordinary-exception case above by reading the message, both correctly reported as `runtime_error` rather than a misleading `syntax_error` (research.md §6).

Call `run_python` with `{ "code": "while True:\n    pass\n", "timeoutSeconds": 1 }`.

Expected: after about 1 second, `{ code: "timeout", ... }` — not left pending (SC-003).

## 5. No network/filesystem/env access (validates FR-008, SC-004)

Call `run_python` with a script that attempts any of: opening a socket, reading a file path outside what was passed via `args`, or reading a host environment variable.

Expected: the attempt does not succeed — either a `runtime_error` reporting the capability is unavailable, or the operation behaving as if the resource simply doesn't exist. It must never appear to succeed.

## 6. Tool toggle (validates FR-009)

From the `/manage-tools` page (spec 025), disable `run_python` (listed under the "Code Execution" group).

Expected: a subsequently (re)connected MCP client no longer sees `run_python` in its tool list at all. Re-enable it to restore.

## 7. Scheduled Task exposure (validates FR-010)

Configure a Scheduled Task (spec 032) whose prompt asks it to run a short Python script via `run_python`.

Expected: on the schedule firing, the task's run record shows the script executed and its output, the same way any other tool call in a Scheduled Task run does — without a live conversation present.

## Cleanup

Call `delete_file` with `{ "path": "demo/scripts/greet.py" }`, then `delete_directory` with `{ "path": "demo/" }` and again with `{ "path": "Trash/" }` to permanently empty Trash.
