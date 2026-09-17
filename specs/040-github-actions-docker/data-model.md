# Data Model: GitHub Actions Docker Delivery

## Application Image

- `registry`: fixed to `ghcr.io`
- `repository`: `harnios/harnios-mcp`
- `commit_sha_tag`: immutable source revision identifier
- `latest_tag`: mutable pointer to the latest successful `main` build
- `port`: `3000`
- `health_path`: `/api/health`

## CI Run

- `event`: pull request or push to `main`
- `source_revision`: Git commit SHA
- `validation`: dependency install, lint, production build
- `publish`: false for pull requests; true for successful `main` pushes

## Coolify Runtime

- `image`: GHCR image reference
- `environment`: existing runtime variables supplied by Coolify
- `domain`: existing configured public domain
- `persistent_storage`: external S3/MinIO configuration, not stored in the image
