# Feature Specification: Universal File Ingest

**Feature Branch**: `039-universal-file-ingest`

**Created**: 2026-09-16

**Status**: Draft

**Input**: User description: "Allow a model-independent chat workflow to send a user to an authenticated Harnios upload page, store a CSV in the Harnios S3 filesystem, and invoke a registered job using only the resulting file path."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Upload a source file for a chat workflow (Priority: P1)

An authenticated user asks a connected assistant to process a CSV but has not yet stored it in Harnios. The assistant provides one upload link. The user selects the file in the browser, receives its stored path, and can return to the conversation with that path.

**Why this priority**: It creates the missing bridge between files on a person's device and persistent workflows without sending file contents through a model conversation.

**Independent Test**: Open the upload link while signed in, upload one eligible CSV, and confirm a unique stored path and file metadata are shown.

**Acceptance Scenarios**:

1. **Given** an authenticated user needs to process a local CSV, **When** they open the upload link and select the CSV, **Then** the file is stored and the page shows its resulting workspace path.
2. **Given** two files have the same original filename, **When** they are uploaded separately, **Then** both are retained at distinct workspace paths.
3. **Given** a user has not authenticated, **When** they open the upload link or submit a file, **Then** they are asked to authenticate before any file is stored.

---

### User Story 2 - Start a registered workflow from an uploaded file (Priority: P1)

An operator returns to any connected assistant after uploading a CSV. The assistant uses the stored path as the workflow input, receives only completion metadata, and gives the operator the generated result link.

**Why this priority**: Uploading is useful only when it feeds the same reusable, model-independent workflow already used for files stored in Harnios.

**Independent Test**: Upload an eligible CSV through the new entry point, invoke the registered table-generation workflow with its returned path, and confirm the HTML output exists without inspecting the CSV in the conversation.

**Acceptance Scenarios**:

1. **Given** an uploaded CSV path is available, **When** an assistant invokes an eligible registered workflow with that path, **Then** the workflow can complete without the CSV content being sent to the assistant.
2. **Given** the workflow completes, **When** the assistant receives its result, **Then** it receives output metadata and a summary but no source-file records or generated-file body.
3. **Given** more than one eligible uploaded CSV is present, **When** the user has not identified one, **Then** the assistant asks the user which file to use.

---

### User Story 3 - Reuse the ingestion flow from any connected client (Priority: P2)

An operator uses a model or client other than the current chat client. That client can direct the user to the same upload experience and pass the returned workspace path to a registered workflow.

**Why this priority**: The workflow must not depend on a proprietary attachment format or one model provider.

**Independent Test**: Use a second authenticated client to obtain the upload destination and process the returned CSV path with the same workflow.

**Acceptance Scenarios**:

1. **Given** a connected client can call Harnios tools, **When** it asks for the upload destination, **Then** it receives the upload link, supported file types, size limit, and destination information.
2. **Given** a client uses the returned upload link, **When** the user finishes the browser upload, **Then** the returned path is valid for the same eligible workflow regardless of client.

### Edge Cases

- A file with an unsupported type is rejected with an understandable message and no file is stored.
- A file larger than the allowed size is rejected without a partial stored file.
- An interrupted or failed upload produces no successful path for the assistant to process.
- A user supplies a path outside the workspace upload area to the workflow; the workflow rejects it unless its registered input policy permits it.
- The upload area contains multiple CSV files; the assistant does not guess which one the user intended.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide authenticated users with a dedicated upload experience for a single local file and show the resulting workspace path after a successful upload.
- **FR-002**: The system MUST store each successfully ingested file under a unique path in `data/inbox/`, preserving the original filename in a human-recognizable form.
- **FR-003**: The system MUST accept only the workspace's existing allowed file types and maximum file size, and clearly reject invalid files before publishing them.
- **FR-004**: The system MUST preserve an ingested file's bytes and record its type and size with the stored file.
- **FR-005**: The system MUST provide connected assistants a model-independent way to obtain the upload link, inbox destination, accepted types, and size limit without exposing storage credentials.
- **FR-006**: The system MUST permit registered workflows to opt in to CSV inputs stored under `data/inbox/` while still limiting each run to the one selected input path.
- **FR-007**: The system MUST let an assistant use an uploaded file path as a registered workflow input without reading or embedding the file content in the conversation.
- **FR-008**: The system MUST return upload and workflow results as paths and metadata, not file contents, by default.
- **FR-009**: The system MUST retain the current multi-file folder upload experience unchanged.

### Key Entities *(include if feature involves data)*

- **Ingested file**: A single user-selected local file stored at a generated unique path in the workspace inbox, with its original name and file metadata.
- **Upload destination**: The authenticated browser location and workspace inbox information supplied to a connected assistant for a user-managed upload.
- **Workflow input path**: The stored-file path selected by a user and supplied to a registered workflow; it identifies the sole input available to that run.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An authenticated user can upload a valid CSV and obtain its workspace path in under 30 seconds on a normal broadband connection.
- **SC-002**: 100% of successful single-file uploads have a distinct stored path, including files with identical original filenames.
- **SC-003**: 100% of rejected type, size, authentication, and upload-failure cases leave no successful workspace path or partial file available for processing.
- **SC-004**: An operator can complete upload-to-generated-HTML processing using only paths and completion metadata, with no CSV or HTML body copied into the conversation.
- **SC-005**: A connected client can obtain the same upload destination and use the resulting CSV path with the registered workflow without client-specific workflow behavior.

## Assumptions

- The existing workspace authentication model remains the authority for the browser upload and external callers.
- The existing allow-list and 25 MB per-file maximum apply to the inbox upload in this version.
- The inbox is persistent workspace storage and is not automatically cleaned up in this feature.
- V1 supports a browser upload link rather than automatic transfer of an attachment from a specific chat provider.
- Registered workflows may broaden their persisted CSV input scope to `data/` when they need to accept files from the inbox; each run remains restricted to its supplied single input path.
