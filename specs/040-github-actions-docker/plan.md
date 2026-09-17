# Implementation Plan: GitHub Actions Docker Delivery

**Branch**: `040-github-actions-docker` | **Date**: 2026-09-17 | **Spec**: [spec.md](./spec.md)

## Summary

Package the existing Next.js application under `frontend/` as a multi-stage production image, validate it in GitHub Actions, publish it to public GHCR on successful `main` pushes, and document the Coolify image configuration and rollback procedure.

## Technical Context

**Language/Version**: TypeScript, Next.js 16, Node.js 22 Alpine runtime
**Primary Dependencies**: Existing `frontend/package.json`; Docker BuildKit; GitHub Actions
**Storage**: External S3-compatible storage at runtime; no database in this app
**Testing**: `npm ci`, `npm run lint`, `npm run build`, Docker build and container smoke checks
**Target Platform**: Linux Docker host managed by Coolify
**Project Type**: Single Next.js web application with embedded MCP route
**Performance Goals**: Production image contains only runtime artifacts and starts on port 3000
**Constraints**: No secrets in image; root MinIO compose remains local-only; no commit/push
**Scale/Scope**: One repository and one Coolify application

## Constitution Check

The repository constitution remains an unfilled template, so no concrete gates apply. The plan preserves existing application behavior and adds automated validation before publication.

## Project Structure

```text
frontend/Dockerfile
frontend/.dockerignore
.github/workflows/docker.yml
specs/040-github-actions-docker/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/image-delivery.md
└── tasks.md
```

## Implementation Details

- Set `output: "standalone"` in `frontend/next.config.ts`.
- Use `node:22-alpine` builder/runtime stages and `npm ci` from `frontend/package-lock.json`; label the image with the public repository source for GHCR package linkage.
- Start with `node server.js` from the standalone output, bind to `0.0.0.0`, port 3000.
- Use GitHub Actions permissions `contents: read` and `packages: write`.
- Run lint/build on pull requests; on `main`, build and push SHA plus `latest` tags.
- Configure Coolify to use `ghcr.io/harnios/harnios-mcp:latest`, with deploy triggered after image publication; preserve current env values and domain.

## Complexity Tracking

Not applicable.
