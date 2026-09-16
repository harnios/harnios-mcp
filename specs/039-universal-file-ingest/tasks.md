---
description: "Task list for universal file ingest"
---

# Tasks: Universal File Ingest

**Input**: Design documents from `/specs/039-universal-file-ingest/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare shared configuration and ingestion boundaries.

- [X] T001 [P] Add canonical public application URL configuration with `PUBLIC_APP_URL` validation in `frontend/lib/config/publicUrl.ts`.
- [X] T002 [P] Add shared single-file ingestion service for basename sanitization, UUID naming, existing extension/size validation, and S3 metadata publication in `frontend/lib/ingest/service.ts`.
- [X] T003 [P] Add the ingestion error-to-HTTP mapping and response types in `frontend/app/api/ingest/route.ts`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Connect shared ingestion to the existing authenticated application without changing the current folder uploader.

- [X] T004 Wire the shared ingestion service to the existing owner-session/OAuth/PAT guard and S3 file primitives in `frontend/app/api/ingest/route.ts` and `frontend/lib/ingest/service.ts`.
- [X] T005 [P] Reuse the existing localized editor upload labels and messages in `frontend/app/upload/UploadForm.tsx`.
- [X] T006 [P] Add the upload-page documentation and link semantics to `frontend/lib/docs/tools.md`.

**Checkpoint**: Shared validation, authentication, storage, and user-facing terminology are ready.

---

## Phase 3: User Story 1 - Upload a source file (Priority: P1) 🎯 MVP

**Goal**: An authenticated user can open a dedicated page, upload exactly one allowed file, and receive a unique `data/inbox/` path without file contents entering chat.

**Independent Test**: Open `/upload`, submit a valid CSV, and verify a unique path and metadata; repeat with the same filename and with invalid/oversized files.

- [X] T007 [US1] Implement authenticated single-file multipart handling with `201` metadata success and `400`/`401`/`413`/`415`/storage errors in `frontend/app/api/ingest/route.ts`.
- [X] T008 [US1] Implement the authenticated `/upload` server page and login continuation in `frontend/app/upload/page.tsx`.
- [X] T009 [US1] Implement file selection, client-side allow-list filtering, upload progress, success metadata/path display, and terminal error states in `frontend/app/upload/UploadForm.tsx`.
- [X] T010 [US1] Add browser and HTTP validation scenarios for unique names, byte-preserving CSV upload, rejected types, oversized files, unauthenticated access, and no partial object in `specs/039-universal-file-ingest/quickstart.md`.

**Checkpoint**: User Story 1 is independently usable as a secure browser upload handoff.

---

## Phase 4: User Story 2 - Start a workflow from the uploaded file (Priority: P1)

**Goal**: The uploaded path feeds a registered job directly and the assistant receives only completion metadata.

**Independent Test**: Use a CSV path returned by `/upload` with `run_job` and verify the generated HTML and metadata-only response.

- [X] T011 [US2] Update the persisted manifest at `os/jobs/tabella-polizze-scadenza/manifest.json` so its CSV input prefix accepts `data/` while retaining the `.csv` extension and single-input contract.
- [X] T012 [US2] Update the persisted skill at `os/skills/tabella-polizze-scadenza.md` to select a returned inbox path and invoke `run_job` without `read_file`, `run_python`, or content transfer.
- [X] T013 [US2] Verify `run_job` accepts `data/inbox/<uuid>-*.csv`, publishes `data/polizze/tabella-scadenza.html`, and returns no source or output body; record the command and expected result in `specs/039-universal-file-ingest/quickstart.md`.

**Checkpoint**: Upload-to-job-to-HTML works with only S3 paths and compact metadata in the conversation.

---

## Phase 5: User Story 3 - Reuse from any connected client (Priority: P2)

**Goal**: Any authenticated MCP client can discover the same upload page and policy metadata.

**Independent Test**: Call `get_upload_link` from a second MCP client, open the returned URL, and pass the resulting path to the workflow.

- [X] T014 [US3] Implement the no-input `get_upload_link` MCP tool returning absolute `PUBLIC_APP_URL/upload`, `data/inbox/`, shared accepted extensions, and `maxBytes` in `frontend/lib/mcp-tools/ingestTools.ts`.
- [X] T015 [US3] Register `get_upload_link` in `frontend/lib/mcp-tools/register.ts` and add it to the gated catalog in `frontend/lib/mcp-tools/catalog.ts`.
- [X] T016 [US3] Document the MCP contract and client handoff in `frontend/lib/docs/tools.md`, referencing `specs/039-universal-file-ingest/contracts/get-upload-link.md`.
- [X] T017 [US3] Add cross-client verification steps, including missing `PUBLIC_APP_URL` and multiple inbox CSV selection, to `specs/039-universal-file-ingest/quickstart.md`.

**Checkpoint**: A second MCP-capable client can complete the same upload and workflow handoff without provider-specific logic.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Regression, documentation, and release validation.

- [X] T018 [P] Update the tool-status and user documentation surfaces for `get_upload_link` in `frontend/lib/mcp-tools/catalog.ts` and `frontend/lib/docs/tools.md`.
- [X] T019 Run `cd frontend && npm run build` and `git diff --check`; resolve any TypeScript, route, or formatting failures.
- [ ] T020 Run every scenario in `specs/039-universal-file-ingest/quickstart.md`, confirm the existing `/api/upload` folder flow is unchanged, and record observed results in the implementation handoff.

---

## Dependencies & Execution Order

- Phase 1 has no dependencies; T001–T003 can run in parallel.
- Phase 2 depends on Phase 1; T005–T006 can run in parallel with T004.
- User Story 1 depends on Phase 2 and is the MVP.
- User Story 2 depends on the completed User Story 1 path contract.
- User Story 3 depends on the upload URL/configuration from User Story 1 and the workflow handoff from User Story 2.
- Phase 6 depends on all desired stories.

## Implementation Strategy

1. Complete Phases 1–2 and validate the shared boundary.
2. Deliver User Story 1 as the MVP and verify browser upload independently.
3. Add User Story 2 and verify the S3-only job handoff.
4. Add User Story 3 and verify a second MCP client.
5. Run the complete quickstart and build checks before deployment.
