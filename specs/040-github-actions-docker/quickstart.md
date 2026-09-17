# Quickstart: Docker Delivery

## Local validation

From the repository root:

```sh
cd frontend
npm ci
npm run lint
npm run build
docker build -t harnios-mcp:local .
```

Run the image with the same runtime variables used by Coolify:

```sh
docker run --rm --env-file .env.local -p 3000:3000 harnios-mcp:local
```

Expected results:

- image build succeeds;
- `GET http://localhost:3000/api/health` returns a successful response;
- web UI and `/mcp` route are reachable;
- no `.env`, `data/`, `.git/`, or development dependency content is copied into the final image.

## GitHub Actions validation

- Open a pull request and confirm validation runs without publishing.
- Merge/push to `main` and confirm GHCR contains both the full SHA tag and `latest`.
- Add repository secrets `COOLIFY_DEPLOY_WEBHOOK` and `COOLIFY_DEPLOY_TOKEN`; the publish job then triggers Coolify automatically after pushing the image.

## Coolify rollout

1. Point the existing application to `ghcr.io/harnios/harnios-mcp:latest`.
2. Preserve current domain, port 3000, health path, and runtime variables.
3. Deploy and verify health, `/`, `/files`, `/mcp`, and S3 access.
4. Roll back by selecting the previous full SHA image if verification fails.
