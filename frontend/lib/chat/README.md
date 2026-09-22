# Chat server modules

These modules are server-only seams for the global chat MVP:

- `model.ts` resolves the configured provider and model without exposing keys.
- `context.ts` loads `os/AGENTS.md` and composes the trusted base instructions.
- `mcpBridge.ts` discovers and executes the enabled Harnios MCP tools.
- `errors.ts` converts internal failures to safe public chat errors.

The browser owns only ephemeral UI state. Do not add S3, localStorage, or
sessionStorage persistence here without a new feature specification.
