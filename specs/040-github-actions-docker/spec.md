# Feature Specification: GitHub Actions Docker Delivery

**Feature Branch**: `040-github-actions-docker`
**Created**: 2026-09-17
**Status**: Draft
**Input**: User description: "Spostare build e trasferire il progetto harnios-mcp a Docker, usando GitHub Actions e Coolify"

## User Scenarios & Testing

### User Story 1 - Build and publish the application image (Priority: P1)

As the maintainer, I want GitHub Actions to validate the Next.js app and publish a Docker image on pushes to `main`, so Coolify does not need to build the application on the server.

**Independent Test**: A pull request runs validation without publishing; a push to `main` publishes an image tagged with the commit SHA and `latest`.

**Acceptance Scenarios**:
1. Given a pull request, when the workflow runs, then dependency installation, lint, and production build complete without publishing an image.
2. Given a push to `main`, when validation succeeds, then GHCR contains an image tagged with the commit SHA and `latest`.
3. Given missing runtime secrets, when the image is built, then no application secret is embedded in the image.

### User Story 2 - Run the published image in Coolify (Priority: P1)

As the operator, I want the existing Coolify application to run the published image, preserving its domain, runtime environment, storage connection, and health behavior.

**Independent Test**: Deploy the published image to the existing Coolify service and verify the health endpoint, web UI, MCP endpoint, and S3-backed storage.

**Acceptance Scenarios**:
1. Given a published GHCR image, when Coolify deploys it, then the container starts on port 3000 and reports healthy.
2. Given the existing Coolify runtime variables, when the image runs, then `/`, `/api/health`, `/files`, and `/mcp` remain available.
3. Given a failed deployment, when the previous image tag is selected, then the service can roll back without changing persisted storage.

### User Story 3 - Maintain local development separation (Priority: P2)

As a developer, I want Docker packaging for the app to remain separate from the repo-root MinIO development compose file, so local storage data is not included in production images.

**Independent Test**: Build the app image from `frontend/` and start it with runtime environment variables while MinIO remains managed by the existing root compose file.

**Acceptance Scenarios**:
1. Given a Docker build context, when the image is built, then `.env*`, `data/`, `.git/`, and development dependencies are excluded.
2. Given the root compose file, when local MinIO starts, then its ports and bind-mounted data behavior remain unchanged.

## Edge Cases

- A failed lint or production build must prevent image publication and deployment.
- A concurrent deployment must not overwrite the immutable commit-SHA image tag.
- GHCR or Coolify availability failures must leave the currently running service unchanged.
- Runtime secrets must be supplied by Coolify and never by build arguments or committed files.
- The image must start correctly when optional messaging or scheduler variables are absent, matching existing app behavior.

## Requirements

### Functional Requirements

- **FR-001**: The repository MUST provide a production Dockerfile for the Next.js app rooted at `frontend/`.
- **FR-002**: The Docker image MUST run the app as a non-development production process on port 3000.
- **FR-003**: The Docker build MUST exclude secrets, local storage data, Git metadata, and development-only dependencies from the final image.
- **FR-004**: GitHub Actions MUST run dependency installation, lint, and production build checks on pull requests.
- **FR-005**: GitHub Actions MUST publish a GHCR image on successful pushes to `main`, tagged by commit SHA and `latest`.
- **FR-006**: The workflow MUST authenticate to GHCR using the GitHub-provided token and least-required package write permission.
- **FR-007**: Coolify MUST be configurable to deploy the GHCR image through its existing application and deployment mechanism.
- **FR-008**: Runtime environment variables MUST remain outside the image and continue to be managed by Coolify.
- **FR-009**: The image MUST expose a health check using `/api/health` and preserve the existing application port; the application MUST return a successful health response without requiring storage access.
- **FR-010**: The deployment MUST support rollback by retaining immutable SHA-tagged images.
- **FR-011**: The root MinIO compose workflow MUST remain local-development-only and unchanged.
- **FR-012**: After a successful image publication, the workflow MUST optionally trigger a Coolify deploy webhook when the required GitHub secrets are configured.
- **FR-013**: The published OCI image MUST declare the public repository as its source so a newly recreated GHCR package can inherit the repository's public visibility and remain anonymously pullable.

### Key Entities

- **Application image**: Immutable Docker artifact published to GHCR, identified by repository and commit SHA.
- **CI workflow**: GitHub Actions pipeline that validates source and publishes successful `main` builds.
- **Coolify deployment**: Existing runtime service configured to pull and run an application image with externally supplied environment variables.

## Success Criteria

- **SC-001**: Every pull request receives an automated validation result before merge.
- **SC-002**: Every successful push to `main` produces a pullable GHCR image with an immutable SHA tag.
- **SC-003**: A fresh Coolify deployment reaches healthy status and serves the application without source compilation on the server.
- **SC-004**: No secret value appears in the Docker image layers, workflow logs, or committed configuration.
- **SC-005**: Rollback to the prior SHA-tagged image restores service without data migration or storage loss.

## Assumptions

- Only `harnios-mcp` is migrated.
- The GitHub repository is `harnios/harnios-mcp` and production branch is `main`.
- GHCR is public; Coolify can pull the image without registry credentials.
- Coolify remains the runtime and existing domain and environment variables are preserved.
- The current Next.js app is the deployable unit; root MinIO is not part of the production image.
- No Git commit or remote push is performed by this implementation.
