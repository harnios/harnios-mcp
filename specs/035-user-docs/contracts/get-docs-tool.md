# Contract: `get_docs` MCP tool

Registered in a new `frontend/lib/mcp-tools/docsTools.ts`, alongside (not inside)
`engineTools.ts` — see research.md §1 for why the content module is separate from the engine
content. Content itself comes from `frontend/lib/docs/content.ts` (data-model.md).

## Registration

- One tool, `get_docs`, registered via `registerGatedTool(server, disabledTools, ...)` — subject
  to the same owner tool-disable gating (spec 023) as every other native tool, no special-casing.
- Added to `TOOL_CATALOG` (`frontend/lib/mcp-tools/catalog.ts`) as `{ name: "get_docs", group:
  "Docs" }` — a new group, since this is the first tool of this kind.
- Called from `registerNativeTools` (`frontend/lib/mcp-tools/register.ts`) exactly like
  `registerEngineTools`/`registerMessagingTools`/etc. — so it's available identically from the
  real `/mcp` HTTP endpoint and, if ever needed, any other in-process tool runtime this server
  builds (mirroring how `registerNativeTools` is already shared with the scheduler's tool runtime,
  spec 032) — though nothing about `get_docs` is scheduler-specific.

## Input schema

```ts
{
  topic: z.enum(["overview", "dashboard", "files", "tools", "schedules", "settings"])
    .optional()
    .describe(
      "Which app-documentation topic to retrieve. Omit for the general overview."
    ),
}
```

## Output

`CallToolResult` with a single text content block: the full Markdown body of the requested
topic (`"overview"` when `topic` is omitted) — `getDocsContent(topic)` from
`frontend/lib/docs/content.ts`. Plain text content, not JSON — matches the engine tools'
convention (the tool's only job is handing the caller the document, not structured data).

## Error behavior (FR-007)

An unrecognized `topic` value is rejected by the MCP SDK's own input-schema validation before the
tool handler runs — the resulting error is a standard MCP tool-call validation failure, and a
`z.enum([...])` mismatch's message already names the accepted values. The handler itself has no
"topic not found" branch to write or maintain; there is no way to reach the handler with an
invalid `topic`.

## Tool metadata

| Field | Value |
|---|---|
| `name` | `get_docs` |
| `title` | `Get App Documentation` |
| `description` | Must state, in the description itself (visible in `tools/list` without calling the tool): that this returns documentation about how to use the Harnios app itself (navigation, file manager, tool management, scheduled tasks, settings/connections) — explicitly **not** documentation about the connected business's own OS/data content (that's `get_os_engine`/`get_change_process`, spec 016/033) — and that omitting `topic` returns a general overview. |

## Non-goals

- No structured/JSON output — plain Markdown text, like the engine tools.
- No topic creation/editing through this tool or any other MCP tool — the fixed topic set is a
  code-level concern (data-model.md), out of scope for any write capability.
- Does not read or write anything in the OS's own S3 bucket.
