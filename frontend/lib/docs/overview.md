# Harnios

Harnios is your Company OS: a private workspace, reachable both as a normal web app and by a
connected AI assistant over MCP, that stores your business's files and lets an assistant act on
your behalf using a fixed set of built-in capabilities.

The main menu has five sections:

- **Dashboard** — a starting point with a link to every other page.
- **Files** — browse, read, and edit everything stored in your OS, the same content a connected
  assistant reads and writes.
- **Tools** — see every capability available to a connected assistant, turn individual ones off,
  and connect additional external MCP servers.
- **Schedules** — recurring tasks that run automatically, each with its own prompt and assigned
  model, no manual action required once set up.
- **Settings** — manage which apps and personal access tokens can connect to this instance, and
  send a one-off test message to confirm email/Telegram delivery works.

Pick a topic from the list below for details on any of these.

## In-app chat

When signed in as the owner, use the floating button in the lower-right corner
to open the temporary Harnios assistant. It uses the configured `CHAT_MODEL`
(currently Mistral, falling back to `MISTRAL_MODEL`) and includes the current
`os/AGENTS.md` instructions plus the enabled MCP tools on each request.

The MVP keeps messages in memory only: it does not save chat history to S3 or
the browser. Read-only tools can run directly; mutations, deletions, messages,
jobs, code execution, and external tools require an explicit approval in the
chat. Missing provider configuration is shown as a safe error.
