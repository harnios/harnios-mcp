# Quickstart: Validate `test_agent_behavior`

## Prerequisites

- Start the app with storage, owner authentication and `MISTRAL_API_KEY` / `CHAT_MODEL` configured.
- Enable `test_agent_behavior` and `read_file`; identify a skill such as `os/skills/review/SKILL.md`.
- Connect an MCP client through existing OAuth or a personal access token.

## Scenarios

1. Call the tool using the [contract](./contracts/mcp-agent-behavior-test.md). Confirm `completed`, a non-empty proposal, individual assertion results, bootstrap `read_file({"path":"AGENTS.md"})`, and a real read of the supplied skill.
2. Prompt for a file update, message, job or external call. Confirm a `dry_run`/`simulated_success` trace with `application_status: "not_applied"`, then verify no file, service, job or destination changed.
3. Send an empty prompt, invalid regex or invalid path and confirm safe `invalid_input`; disable the tool and confirm it disappears from discovery.

After implementation, run from `frontend/`:

```sh
npx tsc --noEmit
npm run lint
npm run build
```
