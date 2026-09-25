# Tasks: Agent Behavior Test Tool

**Input**: Design documents from `/specs/044-agent-behavior-test/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/mcp-agent-behavior-test.md`, `quickstart.md`

**Tests**: No automated test tasks are included because the feature specification does not explicitly request a test suite and the repository has no test runner. Manual acceptance scenarios are in `quickstart.md`.

## Phase 1: Setup

**Purpose**: Reuse existing AI SDK, Mistral and MCP dependencies; no package or environment setup is required.

No setup tasks.

---

## Phase 2: Foundational

**Purpose**: Define the isolated execution policy and report primitives required by all user stories.

- [X] T001 [P] Implement tool classification and dry-run result helpers in `frontend/lib/mcp-tools/behaviorTestBridge.ts`; run real calls only for the allowlisted native read tools, return synthetic success for mutating native and all external tools, and classify recursive `test_agent_behavior` calls as dry-run.
- [X] T002 [P] Implement request bounds, required model-response JSON parsing, safe error mapping, assertion evaluation and report types in `frontend/lib/chat/behaviorTest.ts`, following the limits and fields in `data-model.md`.

**Checkpoint**: The behavior-test policy and contract-level data handling are defined before the MCP tool is connected to them.

---

## Phase 3: User Story 1 - Simulate agent behavior safely (Priority: P1) 🎯 MVP

**Goal**: An authenticated MCP agent can ask the internal model to respond to a scenario and receive a concrete proposal without applying mutations.

**Independent Test**: Follow the successful behavior-test and dry-run scenarios in `quickstart.md`; confirm a proposed change is returned and no file, message, job or external destination changes.

### Implementation for User Story 1

- [X] T003 [US1] Implement behavior-test orchestration in `frontend/lib/chat/behaviorTest.ts`, reusing `resolveChatModel`, `loadChatContext`, live tool discovery, `read_file({"path":"AGENTS.md"})` bootstrap and the five-step Harnios tool loop.
- [X] T004 [US1] Add the MCP `test_agent_behavior` registration and Zod input schema in `frontend/lib/mcp-tools/behaviorTestTools.ts`; validate prompt, inline context, relative paths and assertion bounds before resolving the model.
- [X] T005 [US1] Register `test_agent_behavior` through the existing disabled-tool gate in `frontend/lib/mcp-tools/register.ts`, add its owner-visible group to `frontend/lib/mcp-tools/catalog.ts`, and list it in `specs/023-mcp-tool-toggle/contracts/mcp-tool-toggle-config.md`.
- [X] T006 [US1] Connect orchestration to the execution-policy helper in `frontend/lib/mcp-tools/behaviorTestBridge.ts`; expose every enabled native and external schema while intercepting effects before native handlers, external rate limits or remote endpoints run.
- [X] T007 [US1] Ensure each supplied path is sent only as a reference, and add the rule to read skill/test files through MCP tools while retaining only the trusted base `AGENTS.md` in `frontend/lib/chat/behaviorTest.ts`.
- [X] T008 [US1] Return a valid report or safe error from the tool callback and close the in-process MCP client in `finally` in `frontend/lib/mcp-tools/behaviorTestTools.ts`.

**Checkpoint**: The core journey works as one MCP call, the live schema surface is retained, and no mutating tool reaches its real handler.

---

## Phase 4: User Story 2 - Preserve real context reads and explain simulated calls (Priority: P1)

**Goal**: The model can inspect the same authorized instance context as chat, and the caller can distinguish actual reads from simulated effects.

**Independent Test**: Supply a skill path and request an operation with effects; verify the skill was read through a real tool call, the effect returned simulated success, and the report marks it `dry_run`/`not_applied`.

### Implementation for User Story 2

- [X] T009 [US2] Record ordered tool names, JSON-safe arguments, real/dry-run execution mode, outcome and sanitized result preview in `frontend/lib/mcp-tools/behaviorTestBridge.ts`.
- [X] T010 [US2] Include the ordered tool trace and simulated-success versus not-applied distinction in the report assembled by `frontend/lib/chat/behaviorTest.ts`.
- [X] T011 [US2] Verify in the behavior-test bridge that enabled external schemas remain visible but every external call is intercepted before `callExternalTool` and the rate limiter; keep the policy classification in `frontend/lib/mcp-tools/behaviorTestBridge.ts`.

**Checkpoint**: Reports describe tool choices faithfully while confirming that only authorized native reads were executed.

---

## Phase 5: User Story 3 - Evaluate results automatically (Priority: P2)

**Goal**: The calling agent can parse a stable report and inspect deterministic assertion outcomes.

**Independent Test**: Submit required terms, forbidden terms and a required pattern; verify one result per assertion and `invalid_test_response` when the model omits its proposal JSON.

### Implementation for User Story 3

- [X] T012 [US3] Require final model output to contain a non-empty `proposed_changes` array with `summary`, `rationale` and `suggested_change` in `frontend/lib/chat/behaviorTest.ts`; reject invalid or missing output without inventing a proposal.
- [X] T013 [US3] Evaluate required terms, forbidden terms and required patterns against the final response and include every individual result in `frontend/lib/chat/behaviorTest.ts`.
- [X] T014 [US3] Return the complete report fields—status, response, proposed changes, assertions, tool trace, resolved model, duration and safe error—in the MCP result from `frontend/lib/mcp-tools/behaviorTestTools.ts`.

**Checkpoint**: The caller can consume valid output and assertion outcomes without another evaluator model.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Verify operational limits, docs, and compatibility with current tool-management behavior.

- [X] T015 [P] Update the MCP tools guide for the behavior-test tool, dry-run success semantics and report fields in `frontend/lib/docs/tools.md`.
- [X] T016 Confirm timeout, response-size limits and sanitized provider/bootstrap failures match the contract in `frontend/lib/chat/behaviorTest.ts`.
- [ ] T017 Run the manual scenarios in `specs/044-agent-behavior-test/quickstart.md` and record any contract discrepancy in `specs/044-agent-behavior-test/quickstart.md`.

**Implementation note**: T017 remains pending because the current environment has no Node.js runtime and the implementation run did not request manual test execution.

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No changes required; existing dependencies are used.
- **Foundational (Phase 2)**: No setup dependency; blocks all story implementation.
- **User Stories (Phases 3–5)**: Begin after Phase 2. US2 builds on the end-to-end trace returned by US1; US3 builds on the report assembly introduced by US1.
- **Polish (Phase 6)**: Follows implementation of all three stories.

### User Story Dependencies

- **US1 (P1)**: Independent after foundational policy/helpers; delivers the safe core simulation.
- **US2 (P1)**: Depends on US1's registered bridge and report flow to expose trace detail.
- **US3 (P2)**: Depends on US1's orchestration and report flow.

### Within Each Story

- Complete the model/runtime integration before registering it as a live MCP capability.
- Keep external proxy interception before any destination call or rate-limit side effect.
- Keep server validation before provider invocation.

## Parallel Opportunities

- T001 and T002 can be implemented in parallel because they modify separate modules.
- Within US1, T004's input schema and T005's catalog wiring can be prepared in parallel after the foundational helpers; the registration integration is completed after both.
- T009's trace capture and T012–T013's response/assertion handling can proceed in parallel after US1 because they edit separate modules, then integrate through T010/T014.
- Documentation T015 can proceed in parallel with implementation polish once the public report shape is stable.

## Implementation Strategy

1. Complete foundational validation and dry-run policy.
2. Deliver US1 as the MVP: one authenticated MCP call runs the shared chat behavior safely and returns a proposal.
3. Complete US2 trace fidelity, then US3 deterministic assertions and strict report parsing.
4. Run the quickstart and repository static checks before considering the feature complete.

## Format Validation

Every task uses a checkbox, sequential task ID, optional `[P]`, required story label only in story phases, and an explicit file path.
