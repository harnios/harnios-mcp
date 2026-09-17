# Research: GitHub Actions Docker Delivery

## Decision 1: Multi-stage Next.js image

- **Decision**: Build dependencies and application output in a builder stage, then copy only the standalone runtime output and static assets into a small Node runtime stage.
- **Rationale**: Keeps build tooling and development dependencies out of production while matching the existing single Next.js app.
- **Alternative**: Copy the full `node_modules`; rejected because it increases image size and ships unnecessary tooling.

## Decision 2: GHCR with immutable SHA tags

- **Decision**: Publish `ghcr.io/harnios/harnios-mcp:<commit-sha>` and `latest` on successful `main` pushes; pull requests validate but do not publish.
- **Rationale**: SHA tags provide rollback; `latest` gives Coolify a stable deployment target.
- **Alternative**: Tag-only releases; rejected because the agreed trigger is push to `main`.

## Decision 3: Coolify remains runtime

- **Decision**: GitHub Actions builds/pushes; Coolify pulls and runs the image, retaining runtime secrets and deployment controls.
- **Rationale**: Avoids moving persistent storage, domain, proxy, and environment configuration into CI.
- **Alternative**: SSH-driven Docker Compose deployment; rejected because it duplicates Coolify's existing runtime responsibilities.

## Decision 4: Runtime configuration only

- **Decision**: No secrets or environment values are passed as Docker build arguments; all application configuration remains in Coolify.
- **Rationale**: Prevents secret leakage into image layers and keeps deployment configuration mutable without rebuilds.
