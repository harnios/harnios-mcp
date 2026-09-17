# Image Delivery Contract

## Published image

Successful pushes to `main` publish:

```text
ghcr.io/harnios/harnios-mcp:<full-commit-sha>
ghcr.io/harnios/harnios-mcp:latest
```

The full commit SHA tag is immutable for rollback. `latest` points to the newest successful `main` build.

## Runtime contract

- Container listens on TCP port `3000`.
- Container starts the Next.js standalone server.
- Health probe requests `GET /api/health`.
- Runtime secrets are injected by Coolify and are not required during image build.
- The image does not own or mount application data; storage remains external.
