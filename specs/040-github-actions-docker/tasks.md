# Tasks: GitHub Actions Docker Delivery

**Input**: Design documents from `/specs/040-github-actions-docker/`
**Tests**: Validation is explicitly included in the feature plan.

## Phase 1: Setup

- [X] T001 Verify current app configuration and runtime contract in `frontend/package.json`, `frontend/next.config.ts`, and `frontend/.env.example`.
- [X] T002 [P] Add the feature's Docker delivery documentation under `specs/040-github-actions-docker/`.

## Phase 2: Foundational

- [X] T003 Configure Next.js standalone output in `frontend/next.config.ts`, add the storage-independent health route in `frontend/app/api/health/route.ts`, and exempt it from the storage setup redirect in `frontend/middleware.ts`.
- [X] T004 [P] Create the production multi-stage image definition in `frontend/Dockerfile`.
- [X] T005 [P] Create the Docker build context exclusions in `frontend/.dockerignore`.

## Phase 3: User Story 1 - Build and publish image (P1)

- [X] T006 [US1] Add the pull-request and `main` push workflow in `.github/workflows/docker.yml` with least-required GHCR permissions and explicit Node/ESLint setup.
- [X] T007 [US1] Configure SHA and `latest` image metadata and publication to `ghcr.io/harnios/harnios-mcp` in `.github/workflows/docker.yml`.
- [X] T008 [US1] Validate dependency installation, lint, and production build locally from `frontend/`.

## Phase 4: User Story 2 - Run image in Coolify (P1)

- [X] T009 [US2] Add image, port, healthcheck, runtime environment, and rollback configuration instructions to `specs/040-github-actions-docker/quickstart.md` and `specs/040-github-actions-docker/contracts/image-delivery.md`.
- [X] T010 [US2] Build the image locally and verify the standalone server health endpoint and application routes using `specs/040-github-actions-docker/quickstart.md`.

## Phase 5: User Story 3 - Preserve local separation (P2)

- [X] T011 [US3] Verify the root MinIO compose workflow remains unchanged and the Docker context excludes local storage data.
- [X] T012 [US3] Update `README.md` with the Docker build command and the GitHub Actions/Coolify delivery model.

## Phase 6: Polish

- [X] T013 Run the full quickstart validation and inspect the final image for secret or local-data leakage.
- [X] T014 Review `git diff` and `git status`, leaving changes uncommitted and unpushed.

## Dependencies

- T001 → T003-T005 → T006-T008 → T009-T010 → T011-T014.
- T004 and T005 can run in parallel after T001.
- T002, T004, and T005 touch independent files and can run in parallel.

## MVP

T001-T008: self-contained Docker build and GHCR publication workflow. Coolify rollout follows only after the image is validated.
