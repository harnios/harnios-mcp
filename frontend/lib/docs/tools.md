# Tools

The `/tools` page lists every capability available to a connected assistant through this
instance's MCP server: built-in tools (file operations, engine/setup tools, messaging, inbox,
tree search, documentation) grouped by category, plus any tool exposed by a connected external
MCP server.

- **Enabling/disabling**: each native tool can be turned on or off individually. A disabled tool
  disappears from what a connected assistant can call — it behaves as if it doesn't exist, not as
  a tool that exists but errors when called.
- **External connections** (`/tools/connections`): additional MCP servers can be connected, so
  their tools show up alongside the built-in ones. Each connection can be edited, refreshed
  (re-fetching its tool catalog), enabled/disabled, or removed here.

Changes on this page take effect immediately for any assistant that reconnects or refreshes its
tool list — no restart needed.
