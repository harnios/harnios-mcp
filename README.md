# Harnios MCP

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/harnios/harnios-mcp&root-directory=frontend)

Harnios gives AI assistants and the owner-facing web app one shared Company OS workspace. Files, operating instructions, scheduled tasks, and app state live in a configured S3-compatible bucket. The same Next.js application serves the web interface and the authenticated MCP endpoint at `/mcp`.

The app lives in [`frontend/`](frontend/). This repository does **not** include a local MinIO service or a ready-made MCP client configuration; bring an existing S3-compatible bucket and your own credentials. A separately hosted MinIO service remains compatible.

## What you can do

- Browse, upload, create, edit, delete, and download files at `/files`. Markdown, CSV, HTML, Python, and other text files have editor or preview modes; binary files can be opened or downloaded where supported. Moving or renaming a file is available through the `move` MCP tool.
- Open `.bpmn` files as diagrams, inspect or edit their XML, and make visual changes in a Modeler modal. **Apply** updates the unsaved editor state; **Save** persists it. **New BPMN diagram** is offered only in direct process folders at `/processes/<process>` and creates a valid starter file without replacing an existing one. [BPMN specification](specs/043-bpmn-viewer/spec.md)
- Create expiring, read-only file links with optional password protection. View supported formats in the browser, use native sharing where available, and revoke links at `/shares`. Shares last at most 30 days. [Sharing specification](specs/041-temporary-file-sharing/spec.md)
- Use the floating chat on authenticated pages. **Harnios** mode can use enabled MCP tools; **General** mode has no MCP tools. Tool activity, Stop, and Reset controls are visible. The conversation survives client-side navigation but not a full reload. [Chat specification](specs/042-harnios-chat-mvp/spec.md)
- Manage native and connected tools at `/tools`, connect external MCP servers at `/tools/connections`, and create or run Scheduled Tasks at `/schedules`. In-app help is at `/docs`; the same topics are available to assistants through `get_docs`.

## Get started

1. Prepare an existing S3-compatible bucket and credentials that can read and write it. Harnios does not create the bucket.
2. From the repository root, copy the application environment template and fill in its required values:

   ```sh
   cp frontend/.env.example frontend/.env.local
   ```

   Set `S3_ENDPOINT`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_BUCKET`, `OAUTH_OWNER_USERNAME`, and `OAUTH_OWNER_PASSWORD`. Set `S3_FORCE_PATH_STYLE` for your provider (`false` for providers requiring virtual-hosted-style bucket addresses). Keep `frontend/.env.local` private.

3. Install and start the application:

   ```sh
   cd frontend
   npm ci
   npm run dev
   ```

4. Open `http://localhost:3000/init`. If storage is unavailable, this page explains what configuration is missing; enter the values locally or in your hosting platform and restart. After connecting storage and signing in, use `/init` to bootstrap an empty Company OS, then open `/files` or connect an assistant to `http://localhost:3000/mcp`.

The bucket holds workspace files and application state; no separate application database is required. The old bundled MinIO setup has been removed. If you previously used it, ignored data under `data/minio` is **not deleted or migrated**: copy anything you still need into your chosen bucket with an appropriate storage client. Older SpecKit quickstarts may still describe that historical setup; use the steps above for current installations.

### Configuration by capability

| Capability | Environment variables | Notes |
|---|---|---|
| Storage and owner sign-in | `S3_ENDPOINT`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_BUCKET`, `S3_FORCE_PATH_STYLE`, `OAUTH_OWNER_USERNAME`, `OAUTH_OWNER_PASSWORD` | The bucket must already exist. Next.js reads local settings from `frontend/.env.local`, not a repo-root env file. |
| Chat and Scheduled Tasks | `MISTRAL_API_KEY`; optionally `CHAT_MODEL`, `MISTRAL_MODEL`, `SCHEDULER_TIMEZONE`, `SCHEDULER_ENABLED` | The current chat adapter supports Mistral models. The in-process scheduler is disabled on Vercel and should be disabled on extra replicas to avoid duplicate runs. |
| Public share and upload links | `PUBLIC_APP_URL` | Use the public HTTPS origin (or localhost during development), not an internal bind address. Required when generating these links. |
| Email and Telegram tools | `SMTP_*`, `TELEGRAM_BOT_TOKEN`; optionally `TELEGRAM_CHAT_ID` and `MESSAGING_RATE_LIMIT_*` | Configure only the delivery channels you use. Tool availability does not imply delivery credentials are configured. |
| Optional tool-description context | `MCP_BOOTSTRAP_PATH` | Adds guidance from markers in a stored Markdown file. It does not replace the mandatory `AGENTS.md` first-read rule. |

See [`frontend/.env.example`](frontend/.env.example) for the complete variable list and comments. Secrets belong in private environment settings, never in the README or a committed client configuration.

## MCP access and tools

`/mcp` is a Streamable HTTP endpoint. Clients authenticate with OAuth 2.0 or an owner-created personal access token; the owner manages connections and tokens under `/settings`. For each task, the first storage call must read `AGENTS.md` via `read_file`. The server rejects other tool calls until that bootstrap succeeds; if `AGENTS.md` is missing, it directs the client to the OS repair flow. [Bootstrap specification](specs/016-os-engine-split/spec.md)

The application registers **22 native tools**. The table reflects the registration code, not merely the `/tools` display catalog. An owner may disable tools; a disabled tool is absent from the live MCP list. Externally connected servers may add more tools, so the live set depends on configuration and connection state.

| Area | Native tools | Purpose |
|---|---|---|
| Files and directories | `create_file`, `read_file`, `update_file`, `delete_file`, `create_directory`, `list_directory`, `delete_directory`, `move` | Read and manage workspace paths. `create_file` overwrites an existing file. Deletes outside Trash move data into Trash; deleting inside Trash is permanent. |
| Tree search | `list_directory_tree`, `find_files_by_name`, `search_file_content` | Explore nested paths, search names, or search Markdown content. |
| Company OS instructions | `get_os_engine`, `get_os_upgrade`, `get_os_init`, `get_change_process` | Obtain OS build/repair, upgrade, business setup, and structural-change procedures. |
| Messaging | `send_email`, `send_telegram_message` | Send through the configured SMTP account or Telegram bot; email supports plain text and HTML. |
| Execution | `run_python`, `run_job` | Run limited Python without network/filesystem/env access, or a registered job under `os/jobs` with manifest-authorized file access. |
| Inbox and upload | `get_inbox`, `get_upload_link` | Read `data/inbox.md`, or get the authenticated browser upload URL and inbox destination without transferring file contents through the conversation. |
| Help | `get_docs` | Read the same application documentation available at `/docs`. |

`run_python` accepts inline code or a stored `.py` file, not both, and has a maximum 20-second timeout. `run_job` returns a summary and output metadata rather than file contents. External MCP tools are exposed through the same endpoint when their connection is enabled, their names do not collide with native tools, and they have not been disabled. The internal scheduler uses the native tool set, not external proxy tools. [External connections](specs/031-external-mcp-proxy/spec.md) · [Scheduled Tasks](specs/032-scheduled-tasks/spec.md)

Note: `get_change_process` is registered but is currently missing from the owner-facing `/tools` catalog. It is still subject to the server's tool gate; its status just cannot be changed from that page until the catalog is corrected.

## Web interface

| Route | Use |
|---|---|
| `/init` | Show storage-setup guidance or initialize a fresh Company OS. |
| `/files` | Browse, edit, upload, download, share, and model BPMN files. File paths are reflected in the URL for deep links. |
| `/shares` | Review and revoke temporary file shares. |
| `/tools` and `/tools/connections` | Enable/disable catalogued tools and manage external MCP servers. |
| `/schedules` | Create, edit, enable, run, and review Scheduled Tasks. |
| `/settings/connected-apps` and `/settings/personal-access-tokens` | Manage assistant OAuth connections and personal access tokens. |
| `/docs` | Read in-app documentation. |

The `/files` area and management pages require an owner session. Temporary visitor links are limited to the shared file; they do not grant access to the workspace or its edit controls. The previous `/editor` path redirects to `/files`.

## Deploy

For Vercel, import this repository with **Root Directory** set to `frontend/` and configure the same environment variables in the project settings. Set `PUBLIC_APP_URL` to the deployed public origin for visitor-facing links. The app is stateless apart from its external bucket, but the in-process scheduler does **not** run on Vercel; use a persistent single-instance deployment when Scheduled Tasks must run automatically.

GitHub Actions builds and publishes `ghcr.io/harnios/harnios-mcp` after successful pushes to `main`. Coolify can run that image with its own runtime environment settings. For a local application image build, use `docker build -t harnios-mcp:local frontend/`. The image does not contain an object-storage server. No commit or deployment occurs merely by changing this README.

## License

Licensed under the [PolyForm Internal Use License 1.0.0](LICENSE): internal use is permitted; distribution or offering a product or service based on it requires a separate agreement with the copyright holder.
