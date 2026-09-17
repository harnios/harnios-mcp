# Implementation Plan: Universal File Ingest

**Branch**: `039-universal-file-ingest` | **Date**: 2026-09-16 | **Spec**: [spec.md](./spec.md)

## Summary

Provide a model-independent handoff from chat to browser upload: an MCP client obtains an absolute authenticated upload URL, the user uploads one allowed file, Harnios stores it under a generated `data/inbox/` path, and the assistant supplies only that path to `run_job`. The existing folder upload is unchanged.

## Technical Context

**Language/Version**: TypeScript, Next.js 16 App Router, Node.js runtime.

**Primary Dependencies**: Existing Next.js, React, MCP SDK, Zod, AWS S3 SDK, and OAuth/PAT implementation. No new dependency.

**Storage**: Harnios S3 filesystem only; each ingest creates one object below `data/inbox/`.

**Testing**: Existing convention: build/typecheck plus manual HTTP, browser, MCP, and S3 end-to-end validation. No test framework is added.

**Target Platform**: Existing self-hosted Next.js deployment behind Coolify/Traefik, authenticated browser, and MCP clients.

**Project Type**: Existing web service extension.

**Performance Goals**: Valid files up to 25 MB reach S3 and return metadata within 30 seconds under normal broadband conditions.

**Constraints**:

- All data remains in Harnios S3; no file body appears in an MCP result or model conversation.
- The single-file inbox endpoint reuses the existing allow-list, content-type inference, 25 MB limit, and owner session/OAuth/PAT authentication.
- A server-generated UUID prefixes a sanitized basename, preventing same-name collision and caller-selected S3 paths.
- `PUBLIC_APP_URL` supplies the canonical public origin used by MCP to return an absolute `/upload` link; no internal proxy URL is exposed.
- `run_job` remains the executor. The first policy job broadens its persisted CSV prefix to `data/`, but each run still exposes only its one supplied input path to the sandbox. Completed runs return both the relative output path and absolute authenticated viewer/download URLs.

**Scale/Scope**: One upload page, one multipart endpoint, one read-only MCP discovery tool, one shared ingest service, and a manifest/skill migration. Provider-specific automatic attachment transfer is out of scope.

## Constitution Check

`.specify/memory/constitution.md` is the unfilled Spec Kit template and creates no project-specific gates. This design reuses existing S3-only persistence, owner authentication, typed errors, gated MCP registration, and manual end-to-end verification. **Post-design: PASS.**

## Project Structure

### Documentation

```text
specs/039-universal-file-ingest/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/
    ├── ingest-http.md
    └── get-upload-link.md
```

### Source Code

```text
frontend/
├── app/
│   ├── upload/                 # Authenticated single-file page and client form
│   └── api/ingest/route.ts     # Single-file authenticated multipart endpoint
├── lib/
│   ├── ingest/                 # Shared filename, validation, and S3 publication service
│   ├── config/                 # Public application origin configuration
│   ├── mcp-tools/              # get_upload_link registration and catalog entry
│   └── storage/                # Existing S3 primitives and file policy reused
└── lib/docs/                    # Tool and upload-flow documentation
```

**Structure Decision**: File-byte handling lives in a shared server-side ingest service, reusable by the browser route and future adapters. MCP only discovers the destination; it never transports a binary payload.

## Complexity Tracking

No constitution violation or additional service is introduced.
