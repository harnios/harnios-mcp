# Feature Specification: Run Python Scripts via MCP Tool

**Feature Branch**: `037-python-sandbox-tool`

**Created**: 2026-09-04

**Status**: Draft

**Input**: User description: "Add a new MCP tool `run_python` that lets AI agents connected to harness-mcp execute small Python scripts on demand, using an in-process sandboxed Python interpreter — no Docker/VM, no external service, works identically on Vercel serverless and self-hosted Coolify. Requirements: accept either inline Python code or a path to an existing .py file already stored in the workspace (read via the existing file-storage capability); accept optional named args passed as globals into the script; enforce a configurable wall-clock timeout (default 5s, max 20s); capture stdout and the value of the last top-level expression; report distinct error types (invalid_input, syntax_error, runtime_error, timeout, memory_limit_exceeded, sandbox_unavailable) separately from existing file-storage errors; grant NO filesystem/network/env access to the sandboxed script in this version (explicit non-goal, deferred to a future spec); usable both by live-connected agents and by Scheduled Tasks. Non-goals: no third-party Python packages/numpy/pandas (the sandbox only interprets a Python subset with no class inheritance, no generators, no match/del/async-with), no persistent/long-running processes, no new storage system, no new file-browser UI changes, no host-function/network grant in v1."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Run a Python snippet on demand (Priority: P1)

An AI agent connected to the workspace is helping with a task that needs a small computation, transformation, or piece of logic done in Python — a calculation, a text-processing step, generating some structured data — rather than reasoning it out in natural language. Today the agent has no way to actually execute code; it can only describe what code would do. The agent needs to hand over a short Python script and get back what it printed and produced, within the same exchange, without leaving the conversation.

**Why this priority**: This is the entire capability being added — without it, agents have no way to execute anything, they can only talk about it.

**Independent Test**: Can be fully tested by having a connected agent submit a short self-contained script (e.g. one that computes a value and prints it) and confirming the returned output matches what running that script would actually produce.

**Acceptance Scenarios**:

1. **Given** an agent connected to the workspace, **When** it submits a short valid Python script inline, **Then** it receives back the script's printed output and the value it produced, within the same request.
2. **Given** a script that needs specific input values to run (e.g. a number to compute with), **When** the agent supplies those values alongside the script, **Then** the script can use them without the agent having to hand-write them into the source text.
3. **Given** a script that is invalid or fails while running, **When** the agent submits it, **Then** the agent receives a clear failure rather than a silent empty result or a generic error indistinguishable from other failure kinds.

---

### User Story 2 - Run a script already saved in the workspace (Priority: P2)

An agent (or a person working through the agent) has already saved a Python script as a file in the workspace, the same way any other document is saved there. The agent wants to run that saved script by referring to it, without having to re-send its full source text every time, so a script can be written once and reused across a conversation — or across several — as-is or after being edited.

**Why this priority**: Without this, every run requires resending the full source inline, which breaks down as scripts get reused, iterated on, or shared between multiple runs — this is what turns one-off snippets into a reusable "small app."

**Independent Test**: Can be fully tested by saving a script as a workspace file, then invoking the run capability by referencing that file's location, and confirming the output matches what the saved script actually does — including after the file is edited and re-run.

**Acceptance Scenarios**:

1. **Given** a Python script already saved as a file in the workspace, **When** an agent asks to run it by reference to its location, **Then** the tool executes that file's current saved content and returns its output.
2. **Given** a saved script that is later edited, **When** it is run again by the same reference, **Then** the run reflects the latest saved content, not an earlier version.
3. **Given** a reference to a location that doesn't hold a script, **When** an agent asks to run it, **Then** the failure is reported the same way the workspace's other file-based capabilities already report a missing or invalid target.

---

### User Story 3 - Run a script on an automated schedule (Priority: P3)

A recurring, automated task in the workspace (one that fires on its own schedule rather than being triggered by a live conversation) needs to run a Python script as part of what it does — the same way a scheduled task can already use the workspace's other capabilities.

**Why this priority**: Extends the same capability to unattended, recurring use rather than only live conversations — valuable, but the tool is already useful for live agents without it.

**Independent Test**: Can be fully tested by configuring a scheduled task to run a script and confirming it executes and reports its result on the schedule's own cadence, without a live agent present.

**Acceptance Scenarios**:

1. **Given** a scheduled, unattended task configured to run a script, **When** the schedule fires, **Then** the script runs and its result is available the same way any other scheduled task's result is.

---

### Edge Cases

- What happens when a script is syntactically invalid, or written to fail while it runs? The two are reported as distinct outcomes, so the calling agent can tell "this code is malformed" apart from "this code ran and then failed."
- What happens when a script runs longer than the allowed time? It is stopped and reported as a timeout, rather than left running indefinitely or silently cut off with no explanation.
- What happens when a script attempts to reach the network, read/write files outside what it was explicitly given, or read environment configuration? That access is not available to it — such an attempt does not succeed, and does not silently appear to succeed either.
- What happens when a call provides neither inline code nor a reference to a saved script, or provides both at once? The call fails immediately with a clear "you must provide exactly one" error, without attempting to run anything.
- What happens when a call references a saved script that doesn't exist (or isn't a script) at the given location? It fails the same way the workspace's existing file-lookup failures already do, rather than a different, tool-specific "not found."
- What happens when a script produces an unusually large amount of printed output? The amount returned is capped, with a clear indication that it was cut off, rather than returning an unbounded amount.
- What happens when the workspace's owner has turned this capability off? It behaves like any other disabled capability in this workspace — not offered to a connected agent at all.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide a way for a connected agent to submit a Python script and receive its result — printed output and the value it produced — within the same exchange.
- **FR-002**: The system MUST accept a script provided directly as inline source text.
- **FR-003**: The system MUST accept a reference to a Python script already saved as a file in the workspace, and run that file's current saved content in place of inline source.
- **FR-004**: A single run request MUST provide exactly one of inline source or a saved-script reference; providing neither or both MUST fail immediately with a clear input error, without attempting execution.
- **FR-005**: The system MUST allow named input values to be supplied alongside a script, made available to the script without requiring them to be hand-written into its source text.
- **FR-006**: The system MUST enforce a maximum wall-clock execution time per run, with a sensible default and a small configurable ceiling; a run exceeding it MUST be stopped and reported as a timeout, never left running or silently dropped.
- **FR-007**: The system MUST distinguish, in what it reports back, between at least: an invalid call (missing/conflicting inputs), a script that fails to parse, a script that fails while running, a script that timed out, and the capability itself being unavailable — so a calling agent can respond appropriately to each.
- **FR-008**: A running script MUST NOT be able to reach the network, read or write the host filesystem, or read host environment configuration, beyond exactly what it was explicitly given as input for that run.
- **FR-009**: This capability MUST be subject to the same per-workspace enable/disable control already governing every other capability offered to connected agents, and MUST be omitted entirely from what's offered when disabled.
- **FR-010**: This capability MUST be usable both by an agent connected in a live conversation and by the workspace's automated scheduled tasks, consistent with how the workspace's other capabilities are already exposed to both.
- **FR-011**: When a run's printed output is unusually large, the system MUST cap the amount returned and clearly indicate that truncation occurred, rather than returning an unbounded amount.

### Key Entities

- **Script reference**: Identifies an existing Python script already saved as a file in the workspace, by its location — the same file a person or agent could otherwise create, view, or edit through the workspace's existing file capabilities.
- **Run result**: What one execution of a script produces — its printed output (possibly capped), the value it produced, how long it took, and, when it failed, which distinct failure category applies.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A connected agent receives the output of a short Python script within the same exchange it was requested in, with no separate polling step.
- **SC-002**: A script saved once can be re-run any number of times by reference alone, without resending its source, and reflects its latest saved edit each time.
- **SC-003**: 100% of runs that exceed the configured time limit are reported back as a timeout, never left pending indefinitely.
- **SC-004**: Across all observed runs, none reaches the network or the host filesystem/environment beyond what was explicitly supplied as input.
- **SC-005**: Each of the distinct failure categories (invalid call, invalid script, failed script, timeout) is reported in a way a calling agent can tell apart from the others without guessing.
- **SC-006**: When the capability is disabled for a workspace, it is absent from what's offered to a connected agent, with no partial or inconsistent availability.

## Assumptions

- "Small Python scripts/apps" means single-run compute or logic (calculations, data transformation, text processing, structured output generation) rather than a persistent, long-running, or network-facing service — the latter is explicitly out of scope for this feature.
- Scripts run against a safety- and portability-oriented Python-like subset rather than a full, unrestricted Python installation; scripts depending on third-party packages or on language features outside that subset are out of scope for this version and fail with a clear, distinct error rather than partially working.
- Granting a running script controlled access back into the workspace's own storage (so a script could itself read/write workspace files, beyond being handed a reference to run) is out of scope for this feature and left for a future iteration.
- The default and maximum execution time are both short (single-digit seconds by default, a small configurable ceiling) to fit within the system's existing per-request time budget; scripts needing materially longer runs are out of scope.
- No new way of storing or browsing scripts is introduced — saved scripts use the workspace's existing file storage and file-browsing capability as-is.
