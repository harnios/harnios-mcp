# Tasks: Temporary File Sharing

**Input**: Design documents from `/specs/041-temporary-file-sharing/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/shares-http.md](./contracts/shares-http.md), [quickstart.md](./quickstart.md)

**Organization**: Tasks are grouped by user story so each story can be implemented and validated independently after the foundational phase.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish the feature's source layout and shared configuration surfaces.

- [X] T001 Create the sharing module layout under `frontend/lib/sharing/` and the public route layout under `frontend/app/share/[token]/` according to `specs/041-temporary-file-sharing/plan.md`
- [X] T002 [P] Add the feature's owner-facing and public sharing labels to `frontend/lib/i18n/dictionaries/types.ts`, `frontend/lib/i18n/dictionaries/en.ts`, `frontend/lib/i18n/dictionaries/it.ts`, `frontend/lib/i18n/dictionaries/fr.ts`, `frontend/lib/i18n/dictionaries/de.ts`, `frontend/lib/i18n/dictionaries/es.ts`, and `frontend/lib/i18n/dictionaries/ru.ts`
- [X] T003 [P] Add a sharing entry point to the existing file UI in `frontend/app/files/FileEditor.tsx` and create the share form component at `frontend/app/files/ShareDialog.tsx`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Implement storage, credential, authorization, and content-policy primitives required by all user stories.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T004 Define `TemporaryShare`, owner-safe summary, create input, and public authorization result types in `frontend/lib/sharing/types.ts`, preserving required fields and constraints from `specs/041-temporary-file-sharing/data-model.md`
- [X] T005 Implement S3-backed share record persistence under `.shares/<share-id>.json` in `frontend/lib/sharing/store.ts`, including create, get-by-digest, list, update, and revoke operations while excluding raw tokens, password values, `passwordHash`, and `passwordSalt` from owner-safe responses
- [X] T006 Implement random bearer-token generation, token digesting, salted password hashing, password verification, and signed visitor-cookie helpers in `frontend/lib/sharing/credentials.ts` using Node.js crypto primitives without logging secrets
- [X] T007 Implement share validation and authorization in `frontend/lib/sharing/authorize.ts`, enforcing active status, derived expiration, one normalized file path, optional visitor-cookie/password access, and non-sensitive invalid/expired/revoked/unavailable outcomes
- [X] T008 Implement the safe content classification policy in `frontend/lib/sharing/contentPolicy.ts`, allowing inline PDF/images/audio/video and non-executable text views, rendering Markdown safely, and routing HTML/XML-family, office, spreadsheet, archive, and unknown binary formats to the unsupported-preview path
- [X] T009 Exclude the reserved `.shares/` prefix from file explorer, directory, tree-search, and path-resolution surfaces in `frontend/lib/storage/directories.ts`, `frontend/lib/storage/tree.ts`, `frontend/lib/storage/paths.ts`, and any shared listing helper identified during implementation
- [X] T010 Add centralized public-share error mapping and security headers in `frontend/lib/sharing/http.ts`, including non-sensitive public errors, `X-Content-Type-Options: nosniff`, safe disposition handling, and no storage-path leakage

**Checkpoint**: Share records, credentials, authorization, reserved-prefix handling, and content policy are ready for route and UI implementation.

---

## Phase 3: User Story 1 - Create a temporary browser-view link (Priority: P1) 🎯 MVP

**Goal**: An authenticated owner can create a read-only link for one file, optionally protect it with a password, and a visitor can open the valid link without owner authentication.

**Independent Test**: From `/files`, create an unprotected share for a PDF/image and a password-protected share for Markdown, open each in a signed-out private window, verify inline/safe viewing, and verify that invalid password submission reveals no content.

### Implementation for User Story 1

- [X] T011 [US1] Implement `POST /api/shares` in `frontend/app/api/shares/route.ts`, requiring the existing owner guard, validating an existing file and an expiration in the future and no more than 30 days after creation, creating the share record, and returning the one-time share URL per `specs/041-temporary-file-sharing/contracts/shares-http.md`
- [X] T012 [US1] Implement the owner share creation form in `frontend/app/files/ShareDialog.tsx`, including suggested durations of 1 hour, 1 day, 7 days, and 30 days, optional password entry, validation messages, and copyable one-time URL handling
- [X] T013 [US1] Integrate the share action and dialog state into `frontend/app/files/FileEditor.tsx` and `frontend/app/files/EditorApp.tsx`, showing it only for an owner-selected file and preserving existing unsaved-edit navigation guards
- [X] T014 [US1] Implement the public share page at `frontend/app/share/[token]/page.tsx`, showing the active preview shell, password form, loading state, and non-sensitive invalid/expired/revoked/unavailable states without exposing the storage path
- [X] T015 [US1] Implement password verification at `frontend/app/share/[token]/verify/route.ts`, validating the optional password through `frontend/lib/sharing/authorize.ts`, issuing the scoped signed visitor cookie on success, and returning a generic failure on incorrect passwords
- [X] T016 [US1] Implement the protected public content route at `frontend/app/share/[token]/content/route.ts`, authorizing the token and visitor cookie where required, reading the current file through existing storage helpers, and returning safe inline content with the contract headers
- [X] T017 [US1] Add the public preview components in `frontend/app/share/[token]/SharePreview.tsx` and `frontend/app/share/[token]/PasswordForm.tsx`, selecting embedded/image/media/text/Markdown presentation from the content policy without exposing owner-only controls

**Checkpoint**: US1 is independently usable: an owner creates a share and a signed-out visitor views the associated file safely.

---

## Phase 4: User Story 2 - Revoke or let a share expire (Priority: P1)

**Goal**: The owner can inspect active shares and revoke them; every later public request respects revocation and expiration.

**Independent Test**: Create a share, revoke it from the owner management view, reopen the copied URL privately, and verify access is denied; also verify an expired share and continued owner access to the original file.

### Implementation for User Story 2

- [X] T018 [US2] Extend `frontend/app/api/shares/route.ts` with owner-authenticated `GET /api/shares` listing only owner-safe summaries, including status, expiration, password-protected flag, access count, and last-accessed time
- [X] T019 [US2] Implement owner-authenticated `DELETE /api/shares?id=<share-id>` in `frontend/app/api/shares/route.ts`, making revocation terminal and returning the existing non-sensitive not-found behavior for unknown identifiers
- [X] T020 [US2] Create the owner share-management page at `frontend/app/shares/page.tsx` with active/expired/revoked states, expiration display, copy-link affordance for the creation response, and explicit revoke confirmation
- [X] T021 [US2] Add share-management navigation and route access in `frontend/app/_ui/nav.ts`, `frontend/app/_ui/SiteHeader.tsx`, and `frontend/app/shares/layout.tsx` using the existing owner-session gate
- [X] T022 [US2] Update `frontend/app/share/[token]/page.tsx`, `frontend/app/share/[token]/content/route.ts`, and `frontend/lib/sharing/authorize.ts` so expiration and revocation are checked on every request, including requests using an already-issued visitor cookie
- [X] T023 [US2] Add opportunistic successful-access metadata updates in `frontend/lib/sharing/store.ts` for `accessCount` and `lastAccessedAt` without making those fields authoritative for authorization or allowing concurrent updates to reactivate a share

**Checkpoint**: US1 remains functional, while revocation, expiration, owner listing, and owner-only management are independently verifiable.

---

## Phase 5: User Story 3 - View supported and unsupported file types safely (Priority: P2)

**Goal**: Browser-supported files open inline safely; unsupported formats show an explicit preview-unavailable page with optional download and no automatic download.

**Independent Test**: Share PDF/image/audio/video and text/Markdown files, then share DOCX/XLSX/ZIP/HTML/XML, and verify inline or safe text viewing for supported content and the optional-download fallback for unsupported content.

### Implementation for User Story 3

- [X] T024 [US3] Extend `frontend/lib/storage/fileTypes.ts` and `frontend/lib/sharing/contentPolicy.ts` with the allow-listed inline MIME/category rules from `specs/041-temporary-file-sharing/research.md`, preserving the existing upload allow-list and preventing executable HTML/XML-family content from being served inline
- [X] T025 [US3] Implement `GET /share/<raw-token>/download` at `frontend/app/share/[token]/download/route.ts`, reusing public authorization and returning an inert attachment with `application/octet-stream`, `Content-Disposition: attachment`, and `X-Content-Type-Options: nosniff`
- [X] T026 [US3] Add unsupported-format and explicit-download states to `frontend/app/share/[token]/SharePreview.tsx`, ensuring the main share page never redirects or downloads automatically
- [X] T027 [US3] Add safe Markdown and text rendering to `frontend/app/share/[token]/SharePreview.tsx` using the existing Markdown renderer configuration, disabling raw HTML/script execution and preserving readable fallback behavior for malformed content
- [X] T028 [US3] Verify filename, MIME, missing-file, large-file, and response-header handling across `frontend/app/share/[token]/content/route.ts`, `frontend/app/share/[token]/download/route.ts`, and `frontend/lib/sharing/contentPolicy.ts` against the security edge cases in `specs/041-temporary-file-sharing/spec.md`

**Checkpoint**: All in-scope file categories have a safe, independently testable browser-view or optional-download outcome.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Finish localization, documentation, validation, and security review across all stories.

- [X] T029 [P] Complete localized messages for share creation, password verification, expiration, revocation, unsupported preview, optional download, and public errors in `frontend/lib/i18n/dictionaries/en.ts`, `frontend/lib/i18n/dictionaries/it.ts`, `frontend/lib/i18n/dictionaries/fr.ts`, `frontend/lib/i18n/dictionaries/de.ts`, `frontend/lib/i18n/dictionaries/es.ts`, and `frontend/lib/i18n/dictionaries/ru.ts`
- [X] T030 [P] Document temporary sharing behavior, bearer-link security, expiration, password protection, and unsupported-format fallback in `frontend/lib/docs/files.md` and the relevant documentation index in `frontend/lib/docs/content.ts`
- [X] T031 Review all public share responses and logs in `frontend/app/share/[token]/`, `frontend/app/api/shares/`, and `frontend/lib/sharing/` to confirm no raw token, password, S3 key, owner credential, stack trace, or unrelated file metadata is exposed
- [X] T032 Run `npm run lint` and `npm run build` from `frontend/`, then execute every scenario in `specs/041-temporary-file-sharing/quickstart.md` against local S3-compatible storage and record any implementation-specific adjustments in the feature documentation

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No feature dependency; creates shared source and localization surfaces.
- **Phase 2 (Foundational)**: Depends on Phase 1; blocks all user stories because every story uses the same share record, credentials, authorization, and content policy.
- **Phase 3 (US1)**: Depends on Phase 2; delivers the MVP.
- **Phase 4 (US2)**: Depends on US1's share record and public route, then adds management and lifecycle controls.
- **Phase 5 (US3)**: Depends on the public preview/content route from US1 and the authorization behavior from US2.
- **Phase 6 (Polish)**: Depends on the desired user stories being complete.

### User Story Dependencies

- **US1 (P1)**: Can start after Phase 2; no dependency on another user story.
- **US2 (P1)**: Depends on US1's share creation and public routes, but its revoke/list behavior is independently testable once those exist.
- **US3 (P2)**: Depends on US1's public content route and can be implemented independently of the owner management UI in US2.

### Dependency Graph

```text
Phase 1 → Phase 2 → US1 (MVP) → US2
                         └──────→ US3
US1 + US2 + US3 → Polish
```

### Parallel Opportunities

- After Phase 1, T002 and T003 can proceed in parallel.
- Within Phase 2, T004, T006, and T008 can proceed in parallel; T005 depends on T004, T007 depends on T004/T006, and T009/T010 can proceed alongside the core share store.
- After the US1 foundation is in place, T012/T013 (owner UI) and T014/T017 (public UI) can proceed in parallel; T015/T016 depend on the public authorization primitives.
- In US2, T018/T019 route work can proceed in parallel with T020/T021 owner UI work once the route contract is fixed.
- In US3, T024, T025, and T027 touch separate policy/route/UI surfaces and can proceed in parallel after US1's public route exists.
- T029 and T030 can proceed in parallel with the final security review T031.

## Parallel Example: User Story 1

```text
Track A: T011 owner API → T012/T013 owner creation UI
Track B: T014 public page → T015 password verification → T016 content route
Track C: T017 public preview components
```

## Parallel Example: User Story 2

```text
Track A: T018/T019 owner share API
Track B: T020/T021 share management page and navigation
Track C: T022 lifecycle enforcement review after API contracts are stable
```

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 and Phase 2.
2. Implement US1: owner creation, optional password, public page, and safe content route.
3. Validate the unprotected and password-protected browser-view scenarios independently.
4. Stop for review/demo before adding management and extended format handling.

### Incremental Delivery

1. Add US2 for listing, revocation, and expiration enforcement.
2. Add US3 for the complete inline/unsupported content matrix and explicit downloads.
3. Complete Polish and run the full quickstart.

## Notes

- Every implementation task includes at least one concrete repository path.
- `[P]` marks tasks that can be executed in parallel without depending on incomplete work in the same files.
- No Git commit or remote push is part of this task generation or implementation plan.
