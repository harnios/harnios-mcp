# Implementation Plan: Agent Behavior Test Tool

**Branch**: `044-agent-behavior-test` | **Date**: 2026-09-25 | **Spec**: [spec.md](./spec.md)

## Summary

Add native MCP tool `test_agent_behavior`. It runs one Harnios-mode turn with the shared chat model, trusted base `AGENTS.md`, enabled tool schemas, bootstrap and five-step loop. Native informational tools execute normally; mutating native tools and every external proxy are intercepted, returned as simulated success, and recorded as dry-run proposals.

## Technical Context

**Language/Version**: TypeScript 5.9, Next.js 16, Node.js.

**Primary Dependencies**: Existing AI SDK 7, Mistral adapter, MCP SDK 1.26 and Zod 4.

**Storage**: Existing S3-compatible instance storage; no new persisted records.

**Testing**: `npx tsc --noEmit`, `npm run lint`, `npm run build`; deterministic helper tests if a focused runner is added.

**Target Platform**: Existing server-side Next.js deployment.

**Project Type**: Single web application and MCP server.

**Performance Goals**: Completed report or safe error within 30 seconds in 95% of configured-provider calls.

**Constraints**: Reuse `CHAT_MODEL`; no caller credentials/model choice; one ephemeral test; same enabled schemas as chat; only base `AGENTS.md` is preloaded; no test side effects or secret leakage.

**Scale/Scope**: One prompt, 20 path references and five tool/model steps. No UI, history, evaluator model or automatic application of proposals.

## Constitution Check

The constitution is an unfilled template. Repository requirements are met: documentation precedes code, current authentication/tool gates are reused, and no commit/push is included.

**Pre-research gate**: PASS. **Post-design gate**: PASS.

## Project Structure

```text
frontend/
├── lib/chat/behaviorTest.ts             # orchestration, JSON validation, assertions
├── lib/mcp-tools/behaviorTestTools.ts   # MCP registration
├── lib/mcp-tools/behaviorTestBridge.ts  # real-read/dry-run adapter and trace
├── lib/mcp-tools/register.ts
└── lib/mcp-tools/catalog.ts

specs/044-agent-behavior-test/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/mcp-agent-behavior-test.md
```

## Implementation Design

1. Register `test_agent_behavior` through the native registration and disabled-tool gate; add it to the catalog.
2. Validate request, resolve shared chat model/context, then create the normal in-process MCP client with external catalog enabled.
3. List its live schemas; preserve all schemas but replace execution with a policy bridge. Add supplied paths only as names in the test instruction, never file contents.
4. Execute `read_file({"path":"AGENTS.md"})` before generation, matching chat bootstrap; run `generateText` with Harnios context, five-step cap and automatic tools.
5. The bridge runs native informational tools (`read_file`, directory/tree/search, docs/engine, inbox and upload-link). It intercepts file mutations, Python, jobs, messaging and all external tools before handlers/rate-limiters/endpoints; the model receives synthetic success while the report records `dry_run`/`simulated_success`.
6. Require final JSON `{ response, proposed_changes }`, with non-empty `{ summary, rationale, suggested_change }[]`; malformed output is `invalid_test_response`. Evaluate terms/pattern assertions locally and close the client in `finally`.
7. Bound prompt to 12,000 chars, inline instructions to 32,000, paths to 20 × 1,024 chars, assertions to 20 per kind, final output to 120,000 chars, steps to five and wall time to 30 seconds.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| — | — | No constitution violation. |
