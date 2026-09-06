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

## Python execution (`run_python`)

The "Code Execution" group's `run_python` tool lets a connected assistant run a small Python
script — either inline or read from an existing `.py` file already stored in this instance — and
get back what it printed and the value of its last expression, all within a single tool call. It
runs in an isolated, in-process sandbox ([Monty](https://github.com/pydantic/monty)), not a full
Python installation, so it comes with real limitations worth knowing before relying on it:

- **No filesystem, network, or environment access from inside the script.** The script can only
  see what's explicitly passed in via its `args` — it cannot read files itself, make HTTP
  requests, or read environment variables. To run against a file already stored here, read it
  first (`read_file`) and pass its content in as an argument.
- **No system clock.** `datetime.date.today()` (and similar "what time is it" calls) are blocked.
  A script that needs "today's date" must receive it as an argument rather than asking the
  sandbox for it.
- **Only a subset of the Python standard library is available**, and only a subset of Python's
  language features. Notably unavailable: third-party packages of any kind (no `pip`), the `csv`
  module, string `.format()` (use f-strings instead), class inheritance, and generators. Modules
  like `json`, `re`, `math`, and `datetime` (aside from the clock) do work. The full, current list
  of supported/unsupported modules is maintained upstream, not duplicated here since it changes as
  Monty itself evolves: <https://pydantic.dev/docs/monty/limitations/modules/>.
- **A script's return value is limited to what survives the sandbox boundary.** Plain values,
  strings, and lists come back correctly; a `dict` returned as the final value currently comes
  back empty. Until that's addressed, have a script `print()` a plain-text or pipe-delimited
  report instead of returning a dict when the caller needs structured data back.
- **Time and output are capped.** A run is limited to a short wall-clock timeout (a few seconds by
  default, a small caller-configurable ceiling), and very large printed output is truncated rather
  than returned in full.

These limits are deliberate trade-offs for running untrusted, AI-generated code safely without any
external sandboxing service — not bugs to work around by escalating privileges.
