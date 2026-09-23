---
description: "Task list for Harnios Chat MVP"
---

# Tasks: Harnios Chat MVP

**Input**: Design documents from `/specs/042-harnios-chat-mvp/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: No automated test tasks are added because the repository has no test runner and the feature specification defines manual quickstart validation. Type checking, linting, build, contract checks, and manual scenarios are included in the final phase.

**Organization**: Tasks are grouped by user story. Foundational tasks are shared prerequisites; each story phase has an independent checkpoint.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Add compatible AI SDK and assistant-ui dependencies without changing application behavior.

- [X] T001 Add the current mutually compatible `ai`, `@ai-sdk/react`, `@ai-sdk/mistral`, `@assistant-ui/react`, and `@assistant-ui/ai-sdk` dependencies to `frontend/package.json` and update `frontend/package-lock.json`.
- [X] T002 [P] Add `CHAT_MODEL` documentation and the Mistral fallback configuration to `frontend/.env.example`, preserving the existing `MISTRAL_API_KEY` and `MISTRAL_MODEL` settings.
- [X] T003 [P] Create the server-only chat module structure under `frontend/lib/chat/` and document module boundaries in `frontend/lib/chat/README.md`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish shared server-side model, context, error, and MCP seams before implementing user-facing stories.

**⚠️ CRITICAL**: No user story implementation should be considered complete until these foundations are in place.

- [X] T004 Implement the provider/model resolver in `frontend/lib/chat/model.ts`, accepting `CHAT_MODEL` identifiers, falling back to `MISTRAL_MODEL`/`mistral-large-latest`, keeping credentials server-side, and returning safe configuration errors for unsupported providers or missing keys.
- [X] T005 Implement safe chat/provider/tool error normalization in `frontend/lib/chat/errors.ts`, mapping authentication, invalid request, provider, MCP, timeout, and unexpected failures to the public codes in `specs/042-harnios-chat-mvp/contracts/chat-api.md` without secrets or stack traces.
- [X] T006 Extract the reusable in-process MCP server/client transport into `frontend/lib/mcp-tools/inProcessClient.ts`, preserving native disabled-tool gating and client cleanup, then update `frontend/lib/scheduler/toolRuntime.ts` to consume the shared helper without changing scheduler behavior.
- [X] T007 Implement server-side Harnios context loading in `frontend/lib/chat/context.ts`, reading `os/AGENTS.md` from storage for each chat request and composing it with concise base instructions and the MCP availability policy.
- [X] T008 Add the shared chat dictionary shape to `frontend/lib/i18n/dictionaries/types.ts` and provide all required chat labels in `frontend/lib/i18n/dictionaries/en.ts`, `frontend/lib/i18n/dictionaries/it.ts`, `frontend/lib/i18n/dictionaries/de.ts`, `frontend/lib/i18n/dictionaries/es.ts`, `frontend/lib/i18n/dictionaries/fr.ts`, and `frontend/lib/i18n/dictionaries/ru.ts`.

**Checkpoint**: Provider, context, error, MCP transport, and translated string seams are ready for story implementation.

---

## Phase 3: User Story 1 - Conversare con l'assistente (Priority: P1) 🎯 MVP

**Goal**: Deliver a working temporary chat with a real configurable model, streaming responses, and close/reopen behavior.

**Independent Test**: With an authenticated owner session and configured provider, open the chat, send a non-empty message, observe a streamed response, close/reopen the panel, and confirm the messages remain in the current app state.

### Implementation for User Story 1

- [X] T009 [US1] Implement the authenticated `POST /api/chat` route in `frontend/app/api/chat/route.ts`, validating the AI SDK UI-message request, calling `requireOwnerSession()`, resolving the configured model, applying the base context, and returning the current AI SDK-compatible UI message stream.
- [X] T010 [US1] Implement the client assistant-ui runtime and minimal thread/composer in `frontend/app/_ui/ChatPanel.tsx`, using `AssistantRuntimeProvider` and `useChatRuntime` with the `/api/chat` transport, rendering user/assistant messages, loading state, errors, and close control.
- [X] T011 [US1] Add the floating launcher, overlay panel, message list, composer, loading, error, focus, and narrow-viewport styles to `frontend/app/globals.css`, targeting approximately `66.67vw` by `33.33vh` while applying usable responsive clamps.
- [X] T012 [US1] Add the server/client boundary component in `frontend/app/_ui/ChatShell.tsx` that renders the chat client surface only when the owner session is active and the current pathname is an eligible application surface.

**Checkpoint**: An authenticated user can open, use, close, and reopen a real streaming chat without persistence or MCP tool execution.

---

## Phase 4: User Story 2 - Chat disponibile nell'app autenticata (Priority: P1)

**Goal**: Make one chat runtime globally available across authenticated client-side navigation without changing existing routes or forms.

**Independent Test**: Open the chat on at least five authenticated pages, navigate between pages without a full refresh, confirm the launcher remains available and messages/state survive, then verify it is absent when signed out and on excluded public/pre-auth surfaces.

### Implementation for User Story 2

- [X] T013 [US2] Mount `ChatShell` exactly once in `frontend/app/layout.tsx` below the existing app chrome so the client runtime survives client-side navigation and does not duplicate per route.
- [X] T014 [US2] Implement pathname eligibility and chromeless-surface exclusions in `frontend/app/_ui/ChatShell.tsx` for `/oauth/*`, `/init`, `/share/*`, and other non-operational surfaces while allowing authenticated application pages including `/files` when supported.
- [X] T015 [US2] Complete accessible launcher and dialog behavior in `frontend/app/_ui/ChatPanel.tsx`, including accessible name, keyboard close, focus handling, disabled submit during an in-flight request, and preservation of the current URL.
- [X] T016 [US2] Verify all new visible labels and aria text use the typed translations from `frontend/lib/i18n/dictionaries/types.ts` and all six locale files, without changing existing dictionary keys or route behavior.

**Checkpoint**: The same authenticated chat is available globally, survives client navigation, and remains absent from unauthenticated/public surfaces.

---

## Phase 5: User Story 3 - Contesto Harnios coerente (Priority: P2)

**Goal**: Give the model the live Harnios context and all currently enabled MCP tools, executing authorized calls directly and showing their progress.

**Independent Test**: Ask the chat to read a known file and then request an enabled mutation; verify that the tool starts directly and that the UI shows its result or a clear tool error.

### Implementation for User Story 3

- [X] T017 [US3] Extend the shared MCP transport in `frontend/lib/mcp-tools/inProcessClient.ts` to register both native tools and enabled external proxy tools, preserving collision handling, disabled-tool state, external rate limits, and existing timeout behavior.
- [X] T018 [US3] Implement MCP-to-AI-SDK tool discovery and execution in `frontend/lib/chat/mcpBridge.ts`, converting the live MCP JSON Schemas, delegating calls to `client.callTool`, preserving `isError`, and closing the client in `finally`.
- [X] T019 [US3] Implement direct execution for all enabled native and external tools in `frontend/lib/chat/mcpBridge.ts`, without an approval classifier.
- [X] T020 [US3] Extend `frontend/app/api/chat/route.ts` to load `os/AGENTS.md`, expose the live enabled MCP tool set to the model, and stream tool-call/tool-result/error states without leaking secrets.
- [X] T021 [US3] Add tool-call rendering to `frontend/app/_ui/ChatPanel.tsx`, showing tool name, safe input summary, running/completed/failed state, without approval controls.
- [X] T022 [US3] Align the public chat behavior with `specs/042-harnios-chat-mvp/contracts/chat-api.md` and `specs/042-harnios-chat-mvp/contracts/mcp-chat-bridge.md`, including `401`, invalid request, provider, MCP, timeout, direct execution, and safe error responses.

**Checkpoint**: The chat can use the enabled Harnios MCP surface, displays tool progress, and executes authorized tool calls without an approval deadlock.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Validate the integrated feature, protect existing behavior, and close documentation/configuration gaps.

- [X] T023 [P] Update the chat usage/configuration notes in `frontend/lib/docs/overview.md` or the appropriate docs topic, covering authentication, `CHAT_MODEL`, provider errors, direct MCP execution, and the non-persistent MVP behavior.
- [X] T024 [P] Review `frontend/app/globals.css` and `frontend/app/_ui/ChatPanel.tsx` for light/dark theme compatibility, mobile viewport behavior, keyboard accessibility, focus visibility, and no accidental page scroll lock regressions.
- [X] T025 Run `npx tsc --noEmit` from `frontend/` and resolve type errors across AI SDK, assistant-ui, MCP bridge, translations, and route handlers.
- [X] T026 Run `npm run lint` from `frontend/` and resolve lint errors without changing unrelated application code.
- [X] T027 Run `npm run build` from `frontend/` and resolve build/runtime-boundary issues, especially server-only imports from client components.
- [ ] T028 Execute all scenarios in `specs/042-harnios-chat-mvp/quickstart.md`, including unauthenticated access, client navigation state, `AGENTS.md` context, read tool, direct mutation, disabled tool, provider failure, and external MCP failure.
- [X] T029 Confirm that no chat history, browser persistence record, provider secret, MCP token, storage credential, or stack trace is written to or exposed by the client, and inspect `git diff --check` before handoff.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies; adds packages and module scaffolding.
- **Phase 2 (Foundational)**: Depends on Phase 1; blocks all stories because every story uses the model, context, translations, or shared MCP seam.
- **Phase 3 (US1)**: Depends on Phase 2; delivers the first usable chat increment.
- **Phase 4 (US2)**: Depends on US1's `ChatShell`/`ChatPanel`; global mounting can begin after the client surface exists.
- **Phase 5 (US3)**: Depends on Phase 2 and the `/api/chat` stream from US1; extends the same route/runtime with direct MCP tools.
- **Phase 6 (Polish)**: Depends on all desired stories.

### User Story Dependencies

- **US1**: Starts after Phase 2; independent MVP for text chat.
- **US2**: Depends on US1's client component and server gate, but does not introduce a new backend dependency.
- **US3**: Depends on US1's chat endpoint and Phase 2's shared MCP transport; its tool behavior is independently testable after US1.

### Parallel Opportunities

- T002 and T003 can run in parallel after T001 is planned.
- T004, T005, T006, T007, and T008 can be split across independent files after setup; T006 must be reviewed with the scheduler import before merging.
- Within US1, T010 and T011 can proceed in parallel after the runtime/package setup; T009 and T012 touch separate server/client boundaries.
- Within US3, T018 and T019 share `mcpBridge.ts` and should be sequential; T021 can proceed in parallel with T018 once the stream part names are agreed.
- T023 and T024 can run in parallel with the type/lint/build verification tasks.

## Implementation Strategy

### MVP First

1. Complete Setup and Foundational phases.
2. Complete US1 and validate text streaming manually.
3. Complete US2 and validate global navigation behavior.
4. Complete US3 and validate MCP tool execution flows.
5. Run all polish checks and the quickstart before implementation handoff.

### Incremental Delivery

1. **Increment 1**: Basic authenticated streaming chat, no persistence.
2. **Increment 2**: Persistent global launcher/runtime across app navigation.
3. **Increment 3**: Live Harnios MCP tool discovery, execution, and UI state.
4. **Future feature**: Saved S3 history, `@/#/` commands, attachments, diff UX, and richer coding workflows.

## Notes

- Every task follows the required checklist format and includes an exact repository path.
- No Git commit or push is part of this task list.
- The implementation must not silently fall back to a mock model; missing provider configuration is an explicit user-visible error.

## Phase 7: Convergence

- [X] T030 Implement validated `harnios | general` request mode, Harnios-first-step mandatory MCP tool choice, General-mode tool omission, mode-specific system instructions, and safe provider failure behavior in `frontend/app/api/chat/route.ts` and `frontend/lib/chat/context.ts` per FR-019, FR-020, and FR-022 (missing).
- [X] T031 Implement the default-Harnios localized mode selector, persistent runtime-safe mode transport, history-preserving switches, and running lock in `frontend/app/_ui/ChatPanel.tsx` and `frontend/app/globals.css` per FR-018 and FR-021 (missing).
- [X] T032 [P] Add mode labels and replace hard-coded tool status/approval text across `frontend/lib/i18n/dictionaries/types.ts` and all six files under `frontend/lib/i18n/dictionaries/` per FR-014 and FR-017 (partial).
- [ ] T033 Validate Harnios and General mode behavior with `npx tsc --noEmit`, `npm run lint`, `npm run build`, and the mode scenarios in `specs/042-harnios-chat-mvp/quickstart.md` per SC-010, SC-011, and SC-012 (partial).
