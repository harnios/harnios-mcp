# Feature Specification: Persistent Job Runtime

**Feature Branch**: `038-approved-job-runtime`

**Created**: 2026-09-15

**Status**: Draft

**Input**: User description: "Provide persistent, model-independent workflows. A connected model invokes a registered job by identifier; the job processes workspace files without transferring their contents through the conversation. The runtime must be universal rather than tied to a particular business domain."

## Clarifications

### Session 2026-09-15

- Q: Per il job `tabella-polizze-scadenza`, quali file CSV può selezionare il chiamante? → A: The runtime is universal; no domain-specific job or file policy belongs in this feature.
- Q: Dove devono vivere e come devono essere aggiornati i job approvati? → A: All skills, job scripts, and manifests are persisted in the Harnios S3 filesystem; no other storage location is used.
- Q: Come si approva o modifica un job salvato in S3 senza permettere ai normali tool file o a un modello di cambiarne script e permessi? → A: Workflow artifacts live under `os/` in the Harnios S3 filesystem.
- Q: Chi può scrivere o modificare file sotto `os/`? → A: Every authenticated MCP client may modify `os/` for now; restricting writers is deferred to a future security feature.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Run a registered workflow (Priority: P1)

An operator asks any connected assistant to perform a recurring workflow on files already held in the workspace. The assistant selects the registered workflow and supplies validated arguments. The workflow reads its permitted inputs, applies its established rules, writes its permitted outputs, and returns a compact completion record.

**Why this priority**: It delivers the core value: repeatable processing of workspace data without placing inputs or outputs in a model conversation.

**Independent Test**: With a registered workflow and eligible input in the workspace, invoke the workflow with valid arguments and confirm its configured output and completion metadata exist.

**Acceptance Scenarios**:

1. **Given** eligible input is present in the workspace, **When** a connected assistant invokes a registered workflow with valid arguments, **Then** the workflow creates its configured output and returns its path plus summary metadata.
2. **Given** the workflow has completed, **When** the assistant receives its result, **Then** the result contains no input records or generated-file body.
3. **Given** a person uses a different MCP-capable model or client, **When** they invoke the same registered workflow with the same input, **Then** it follows the same persisted rules and produces the same class of output.

---

### User Story 2 - Keep workflows separate from conversations (Priority: P2)

An operator maintains a reusable workflow outside chat sessions. Connected assistants may discover its purpose and invoke it; the workflow's behavior and declared permissions are read from its persistent artifacts rather than supplied in an execution request.

**Why this priority**: Separation is what makes the workflow reusable across models and conversations rather than a prompt-dependent one-off.

**Independent Test**: Attempt to invoke a known workflow while supplying a replacement script, altered permissions, or an unknown workflow identifier; verify the execution request cannot change the registered workflow and no unauthorized file is accessed during that run.

**Acceptance Scenarios**:

1. **Given** a workflow is registered, **When** an assistant invokes it, **Then** only its persisted behavior and declared input fields are available for that run.
2. **Given** an assistant supplies an unknown workflow identifier or an invalid argument, **When** it requests execution, **Then** the request fails clearly before any workspace data is read or written.
3. **Given** an assistant attempts to provide executable source or broader file permissions in a run request, **When** it invokes a workflow, **Then** those values are rejected and do not affect that execution.

---

### User Story 3 - Enforce per-workflow data boundaries (Priority: P3)

The workflow's persisted artifacts define exactly which workspace files it may read and write. During execution, the workflow can use those files naturally, but it cannot inspect other workspace content, host files, network resources, or environment settings.

**Why this priority**: Business data can be processed in place only if the granted data boundary is both narrow and enforceable.

**Independent Test**: Run a workflow that tries to read a permitted file, write a permitted output, and access a sibling or host path not in its declaration; verify the first two operations work and every unauthorized operation fails.

**Acceptance Scenarios**:

1. **Given** a workflow declares one input and one output, **When** it reads and writes those paths, **Then** both operations complete within their declared limits.
2. **Given** a workflow tries to read or write a path outside its declaration, **When** it executes, **Then** that operation is denied without revealing the target's contents or existence.
3. **Given** a workflow creates more output than its allowed size, **When** it writes the output, **Then** the run fails without publishing a partial result.

### Edge Cases

- What happens when the selected input file does not exist, is not an allowed type, or is outside the workflow's persisted input scope? The run fails before processing and does not create an output.
- What happens when the configured output already exists? A successful run replaces it as one complete new version; a failed run leaves the previous version intact.
- What happens when a workflow is disabled? It is not offered to connected assistants and cannot be invoked by identifier.
- What happens when an authenticated client modifies a workflow artifact under `os/`? The new artifact is available according to the current open-write policy; approval and write protection for `os/` are explicitly deferred to a later security feature.
- What happens when a workflow exceeds its time or resource budget? It stops, reports a distinct failure, and does not publish incomplete output.
- What happens when an input contains malformed values? The workflow follows its own persisted validation rules, includes only permitted summary counts, and handles valid records as those rules prescribe.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST let a connected MCP-capable client invoke a registered workflow by a stable workflow identifier and validated named arguments.
- **FR-002**: The system MUST maintain each registered workflow's executable behavior, input contract, resource limits, and allowed read/write locations outside individual conversations and independent of the invoking model.
- **FR-002a**: The system MUST persist every workflow's skill, executable behavior, manifest, and approval metadata under `os/` in the Harnios S3 filesystem; it MUST NOT require a repository, local filesystem, database, or separate storage service for those artifacts.
- **FR-003**: A run request MUST NOT accept executable source text, an executable-file reference, or caller-defined file permissions.
- **FR-004**: Before a workflow reads data, the system MUST validate the workflow identifier and all supplied arguments against that workflow's persisted contract.
- **FR-005**: During a run, the system MUST allow a workflow to read only the workspace files selected by its persisted read policy and write only the workspace files selected by its persisted write policy.
- **FR-006**: The system MUST deny a workflow access to every host filesystem location, network resource, environment setting, and workspace path not granted by its persisted policy.
- **FR-007**: The system MUST enforce a per-workflow execution-time limit and a maximum total output size.
- **FR-008**: The system MUST publish a successful output as a complete file, never expose a partly written replacement, and preserve the prior output if the run fails before publication.
- **FR-009**: On success, the system MUST return a compact completion record containing the workflow identifier, one output path, elapsed time, and workflow-defined summary metadata; it MUST NOT return source-data rows or generated-file contents by default.
- **FR-010**: The system MUST report distinct, machine-readable failures for an invalid request, unavailable or disabled workflow, denied file access, missing or invalid input, execution failure, time limit, output-size limit, and storage failure.
- **FR-011**: The system MUST apply the workspace's existing enable/disable control to `run_job` and omit the tool, and therefore every registered workflow, from the available tool surface when disabled.
- **FR-012**: The system MUST support multiple registered workflows whose identifiers, argument contracts, input/output policies, resource limits, and summary metadata are independent of any particular business domain.

### Key Entities *(include if feature involves data)*

- **Registered workflow**: A persistent operation identified by a stable identifier, with a fixed behavior, input contract, data permissions, resource limits, and result-summary contract for an individual run.
- **Workflow artifact**: The persistent skill, executable behavior, manifest, or registration metadata belonging to a registered workflow and stored under `os/` in the Harnios S3 filesystem.
- **Workflow run**: One request to execute a registered workflow with validated arguments; it has a lifecycle of validation, processing, publication or failure, and a compact result.
- **Data permission**: A workflow-owned declaration of the exact workspace locations and operations it may use during a run. It is not supplied or expanded by the execution request.
- **Completion record**: The small, model-safe result of a successful run: identity, output references, elapsed time, and persisted aggregate metadata.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An operator can complete a registered file-processing workflow in one invocation, without copying input or output contents into the conversation.
- **SC-002**: 100% of attempted accesses outside a workflow's persisted data permissions are denied without exposing file contents during a run.
- **SC-003**: 100% of failed output writes leave any previously published output unchanged and do not leave a partial replacement visible.
- **SC-004**: For every workflow, a successful completion record contains only its persisted output references, duration, and aggregate summary metadata, and contains no individual input record by default.
- **SC-005**: The same registered workflow can be invoked successfully from every connected client that supports the workspace MCP interface, without client-specific workflow logic.
- **SC-006**: 100% of requests that provide unknown workflow identifiers, malformed arguments, source code, or caller-defined permissions fail before reading or writing workspace data.

## Assumptions

- All workflow artifacts, workspace data, and generated outputs are stored in the Harnios S3 filesystem; this feature introduces no other persistence location.
- In this version, every authenticated MCP client may modify workflow artifacts under `os/`. A protected writer/approval model is deliberately deferred and is not claimed as a security boundary here.
- A workflow may return only summaries intentionally declared for it; individual input records and generated-file contents are excluded by default.
- Existing workspace authentication, MCP transport, scheduling, and tool enable/disable mechanisms remain the authority for who can invoke an exposed workflow.
- The first version supports short, single-run transformations. Long-running, interactive, network-connected, or user-supplied-code jobs are out of scope.
