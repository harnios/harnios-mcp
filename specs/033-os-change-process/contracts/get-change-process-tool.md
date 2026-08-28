# Contract: `get_change_process` MCP tool

Follows the exact shape of `get_os_engine`/`get_os_init`/`get_os_upgrade`
(`frontend/lib/mcp-tools/engineTools.ts`).

## Registration

- Added as a fourth entry in `ENGINE_TOOLS` and a fourth key in `ENGINE_CONTENT`.
- Registered via the same `registerGatedTool(server, disabledTools, ...)` call as the other three
  — subject to the same owner tool-disable gating (spec 023), no special-casing.
- Content source: `frontend/lib/os/engine/change-process.md`, read once at module load via
  `readFileSync` with a literal path (mirrors the other three, required for Vercel's `@vercel/nft`
  build-time file tracing to bundle it).

## Input schema

Empty (`{}`) — identical to the other three engine tools. No parameters.

## Output

`CallToolResult` with a single text content block: the full, unmodified contents of
`change-process.md`. Identical shape to the other three engine tools — the tool's only job is to
hand the connected assistant the instructions; all logic (explore, draft, confirm, implement) is
carried out by the assistant itself using the existing file tools, not by this tool.

## Tool metadata

| Field | Value |
|---|---|
| `name` | `get_change_process` |
| `title` | `Get OS Change Process` |
| `description` | Must state, in the description itself (visible in `tools/list` without calling the tool — same pattern as the other three): when to call it (before creating/modifying a skill, a schedule, `os/routing.md`, a policy, requesting a new external connection, **or establishing a place and shape for a kind of business content that has never been tracked before**) and what it returns (the propose → confirm → implement procedure). |

## Non-goals

- No new input parameters, no structured output, no stateful "session" concept at the tool level
  — state (draft/confirmed/implemented/discarded) lives entirely in the `os/changes/<slug>/`
  files themselves (see `change-proposal-files.md`), read and written with the existing
  `read_file`/`create_file`/`update_file`/`list_directory` tools.
- This tool never writes anything itself — it only returns instructions, exactly like the other
  three engine tools.
