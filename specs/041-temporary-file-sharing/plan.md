# Implementation Plan: Temporary File Sharing

**Branch**: `041-temporary-file-sharing` | **Date**: 2026-09-18 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/041-temporary-file-sharing/spec.md`

**Note**: This template is filled in by the `$speckit-plan` command; its definition describes the execution workflow.

## Summary

Add owner-controlled, read-only temporary links for individual files. A visitor can open a valid link without signing in, optionally enter a share password, and view safe file types inline in the browser. Links expire after at most 30 days or can be revoked immediately. The implementation keeps public access behind the application so every request can validate expiration, revocation, password protection, and file scope before reading from S3.

## Technical Context

**Language/Version**: TypeScript 5.9, Next.js 16.2, React 19.2, Node.js runtime

**Primary Dependencies**: Existing Next.js App Router, AWS SDK S3 client, Node.js crypto primitives, existing React Markdown renderer and owner-session authentication

**Storage**: Existing S3-compatible bucket; file objects remain at their current paths and share records use a reserved `.shares/` prefix excluded from file listings

**Testing**: TypeScript/lint/build validation plus end-to-end HTTP/browser scenarios against the existing local S3-compatible development setup; focused unit tests for token, password, expiry, and content-policy helpers

**Target Platform**: Serverless-compatible Next.js deployment and local Node.js development server; desktop and mobile browsers for public viewing

**Project Type**: Full-stack web application with owner-authenticated file management and public read-only share routes

**Performance Goals**: Share creation and owner share-list operations should complete within the normal existing file-management interaction time; a valid public view should begin loading within one normal application request round trip for files up to the existing 25 MB upload limit

**Constraints**: No database service; public routes must not require owner authentication; raw bearer tokens and passwords must not be persisted; revocation must apply on the next request; unsafe browser-executable content must never be served inline; no automatic download for unsupported formats

**Scale/Scope**: One configured owner and one S3 bucket; one share targets one file; existing file size and allowed-extension limits apply; folder shares, editing, ZIP generation, analytics dashboards, and external identity accounts are out of scope

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The repository constitution is still the generated placeholder template and defines no enforceable project principles or gates. No constitution violation is identified for this design. The plan follows the repository's existing constraints: storage-backed state, owner-session protection, S3-compatible portability, and no database dependency.

## Project Structure

### Documentation (this feature)

```text
specs/041-temporary-file-sharing/
├── plan.md              # This file ($speckit-plan command output)
├── research.md          # Phase 0 design decisions
├── data-model.md        # Phase 1 entities and state
├── quickstart.md        # Phase 1 validation guide
├── contracts/           # Phase 1 HTTP contracts
└── tasks.md             # Phase 2 output ($speckit-tasks command - NOT created by $speckit-plan)
```

### Source Code (repository root)
```text
frontend/
├── app/
│   ├── api/shares/                 # owner share management routes
│   ├── share/[token]/              # public share page and content routes
│   └── files/                      # owner file UI and share action
└── lib/
    ├── sharing/                    # share records, token/password validation, policy
    └── storage/                    # existing S3 file/content helpers
```

**Structure Decision**: Extend the existing single `frontend/` Next.js application. Keep sharing logic in a dedicated `frontend/lib/sharing/` module, persist only share metadata under a reserved bucket prefix, expose owner CRUD through `/api/shares`, and expose visitor viewing through `/share/[token]`. Reuse existing owner authentication, S3 storage helpers, file type policy, UI shell, and localization dictionaries.

## Post-Design Constitution Check

The design still passes the available governance gate. It adds no project, database, or external service; it reuses the existing application, S3-backed state, owner authentication, and file-type policy. Public access is deliberately isolated to read-only share routes and does not weaken the owner-authenticated file APIs.

## Complexity Tracking

No constitution violations.
