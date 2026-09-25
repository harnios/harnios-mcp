# Implementation Plan: Harnios Chat MVP

**Branch**: `042-harnios-chat-mvp` | **Date**: 2026-09-22 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/042-harnios-chat-mvp/spec.md`

**Note**: This template is filled in by the `$speckit-plan` command; its definition describes the execution workflow.

## Summary

Implement a global authenticated chat surface that remains mounted across client-side navigation, streams model responses, and offers an explicit `Harnios`/`General` mode. Harnios mode is the default and the server executes `read_file({"path":"AGENTS.md"})` as the first MCP call of every turn; enabled tools execute directly in the MVP. General mode exposes no MCP tools. The browser owns only ephemeral chat and mode state; the server owns authentication, mode validation, model configuration, `os/AGENTS.md` context, MCP discovery, and tool execution. The initial model adapter is Mistral through AI SDK, with a provider/model resolver kept separate so local and OpenAI-compatible providers can be added later.

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: TypeScript, Next.js 16 App Router, React 19, Node.js runtime.

**Primary Dependencies**: Existing `@modelcontextprotocol/sdk` and `mcp-handler`; add current compatible `ai`, `@ai-sdk/react`, `@ai-sdk/mistral`, `@assistant-ui/react`, and `@assistant-ui/ai-sdk`. Use the current transport-based AI SDK API and current assistant-ui adapter; pin mutually compatible versions in `package-lock.json`.

**Storage**: Existing S3-compatible storage for `os/AGENTS.md` and existing MCP tool state. No chat history persistence in this feature.

**Testing**: Existing manual quickstart plus `npx tsc --noEmit`, `npm run lint`, and `npm run build`; add focused pure-function tests only if a test runner is introduced by the implementation, otherwise verify contract scenarios manually.

**Target Platform**: Existing Vercel/serverless-compatible Next.js deployment and local Node.js development.

**Project Type**: Single Next.js web application serving UI, API routes, and MCP server.

**Performance Goals**: Open the chat immediately; begin showing model output as soon as the provider streams it; keep tool discovery and each tool call within the existing MCP/proxy timeouts.

**Constraints**: Owner session required; no secrets in client payloads or rendered errors; no automatic chat persistence; root layout must preserve chat and mode state across client navigation; Harnios mode requires provider support for mandatory tool choice; General mode creates no MCP client; mode changes are blocked during streaming; existing routes and forms remain unchanged; no Tailwind or second UI design system.

**Scale/Scope**: One ephemeral conversation and one ephemeral mode per browser tab and owner session; one global launcher/window; all currently enabled native and external MCP tools in Harnios mode; no tools in General mode; no saved threads, attachments, commands, or multi-user identity model.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The repository constitution is still the unfilled template, so no ratified project-specific gates apply. The plan follows observed repository constraints: single Next.js app, existing S3 datastore, owner-session authorization, shared MCP registration, plain CSS design system, and no Git commit/push.

**Pre-research gate**: PASS — no constitution violations identified.

**Post-design gate**: PASS — the MCP bridge reuses existing registration and authorization paths; the new chat route adds no alternate storage or authentication mechanism.

## Project Structure

### Documentation (this feature)

```text
specs/042-harnios-chat-mvp/
├── plan.md              # This file ($speckit-plan command output)
├── research.md          # Phase 0 output ($speckit-plan command)
├── data-model.md        # Phase 1 output ($speckit-plan command)
├── quickstart.md        # Phase 1 output ($speckit-plan command)
├── contracts/           # Phase 1 output ($speckit-plan command)
└── tasks.md             # Phase 2 output ($speckit-tasks command - NOT created by $speckit-plan)
```

### Source Code (repository root)

```text
frontend/
├── app/
│   ├── _ui/ChatShell.tsx          # server auth/path gate
│   ├── _ui/ChatPanel.tsx          # client assistant-ui surface
│   ├── api/chat/route.ts          # authenticated AI SDK stream route
│   ├── layout.tsx                 # mount ChatShell in persistent root layout
│   └── globals.css                # floating launcher/window/message styles
├── lib/
│   ├── chat/
│   │   ├── context.ts             # AGENTS.md + base prompt
│   │   ├── model.ts               # provider/model resolver
│   │   ├── mcpBridge.ts           # MCP discovery, classification, execution
│   │   └── errors.ts               # safe chat/provider/tool errors
│   ├── mcp-tools/
│   │   └── inProcessClient.ts     # shared MCP server/client transport
│   └── i18n/dictionaries/         # chat labels in all six locales
├── package.json                   # AI SDK and assistant-ui dependencies
└── package-lock.json              # resolved compatible versions
```

**Structure Decision**: Keep the feature inside the existing `frontend/` Next.js application. The root layout owns the persistent client runtime; a server gate controls authenticated visibility. Server-only chat modules isolate provider resolution, OS context, MCP tool discovery, approval policy, and execution from client code. The shared in-process MCP bridge is extracted so scheduled tasks and chat use one registration path.

## Implementation Design

### Request and response flow

```text
Root layout
  └─ ChatShell (server auth/path gate)
       └─ ChatPanel (client)
            └─ assistant-ui runtime
                 └─ useChat transport → POST /api/chat { messages, mode }
                      ├─ requireOwnerSession()
                      ├─ validate mode (default: harnios)
                      ├─ load os/AGENTS.md
                      ├─ resolve provider/model
                      ├─ Harnios: create MCP client + list enabled tools
                      ├─ Harnios: require a tool on first step, then auto
                      ├─ General: omit MCP client and tools
                      ├─ streamText(messages, mode policy)
                      └─ stream UI message response
```

### Model resolver

- Read `CHAT_MODEL`; accept a provider/model identifier such as `mistral:mistral-large-latest`.
- For an omitted value, fall back to the existing Mistral configuration (`MISTRAL_MODEL` or `mistral-large-latest`).
- Keep provider construction in `lib/chat/model.ts`; never import a provider SDK from client components.
- Return a clear server error for unsupported provider identifiers or missing credentials.
- Leave the resolver interface open for `@ai-sdk/openai-compatible`, Ollama, LM Studio, and other future providers.

### MCP bridge and execution

- Extract the existing in-process client setup from `scheduler/toolRuntime.ts` into a shared module.
- Register native tools with current disabled-tool state and register external tools with existing catalog/collision/rate-limit behavior.
- Convert the live MCP catalog's JSON Schema to AI SDK tool schemas; every execution delegates to `client.callTool`.
- Expose and execute the enabled native and external MCP tools directly through the server-side bridge.
- Close the MCP client in `finally` and preserve existing external timeout/error handling.
- In Harnios mode, execute `read_file({"path":"AGENTS.md"})` server-side before starting each new turn while keeping the full MCP catalog exposed to the model for every generation step.
- In General mode, skip MCP client creation and omit the tools option entirely.
- Treat lack of provider support for mandatory tool calling as a safe provider error; never silently answer without the required grounding.

### UI and state

- Use `AssistantRuntimeProvider` + `useChatRuntime` with the current AI SDK adapter.
- Build a minimal custom assistant-ui thread/composer using existing CSS tokens, not the legacy pre-styled package or Tailwind templates.
- Mount once below the root layout so the runtime survives client-side navigation.
- Render an accessible fixed launcher at bottom-right and a fixed responsive panel targeting `66.67vw × 33.33vh`, clamped for narrow screens.
- Provide close/reopen behavior, loading/streaming/error states, and tool-call states; keep tool activity in the UI rather than duplicating it in assistant prose unless the user asks for details.
- Add a localized `Harnios`/`General` mode selector in the panel header, defaulting to Harnios; retain history when switching and disable the selector while the thread is running.
- Keep one transport/runtime instance and supply the current mode through a mutable request-body resolver so changing mode does not reset messages.
- Add all visible labels and aria text to the typed dictionaries in six languages.

### Security and context

- `ChatShell` checks owner session before rendering the client chat; `/api/chat` repeats authorization independently.
- Read `os/AGENTS.md` only on the server and combine it with short base instructions; do not trust a browser-supplied system prompt.
- Validate mode server-side: missing mode means `harnios` for compatibility, while unknown values return `400 invalid_request` before model or MCP work.
- Strengthen Harnios instructions so Company OS facts and actions are grounded in tool results; General mode explicitly states that tools are unavailable.
- Do not send provider keys, MCP tokens, storage credentials, external URLs, or stack traces to the client.
- Sanitize/truncate tool input and result previews in the UI while preserving the full model-visible result server-side.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| — | — | No constitution violation requires justification. |
