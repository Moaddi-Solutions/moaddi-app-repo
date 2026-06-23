# Production deploy (Docker Hub + GitHub Actions)

Merges and pushes to the **`production`** branch run [`.github/workflows/deploy.yml`](workflows/deploy.yml), which:

1. Writes production env from the `NEXT_PRODUCTION_ENV` secret into `.env.production` (used only on the runner for `next build`; not committed).
2. Builds the Next.js **standalone** image and pushes it to Docker Hub as **`:production`** and **`:<git-sha>`**.
3. SSHs to your server, runs **`docker pull`**, stops/removes the old container, and **`docker run`** the new image.

## 1. GitHub repository secrets

**Settings → Secrets and variables → Actions → New repository secret**

### Docker build & registry

| Secret                 | Description |
| ---------------------- | ----------- |
| `DOCKERHUB_USERNAME`   | Docker Hub username |
| `DOCKERHUB_TOKEN`      | Docker Hub access token (recommended) or password — [create token](https://hub.docker.com/settings/security) |
| `DOCKER_IMAGE`         | Full image name on Hub, e.g. `youruser/moaddi-next` (no tag) |
| `NEXT_PRODUCTION_ENV`  | **Multiline** file content: same variables you use in production (e.g. all `NEXT_PUBLIC_*`, `NEXT_READ_ONLY_STRAPI_TOKEN`, etc.). Next inlines `NEXT_PUBLIC_*` at build time. |

### SSH (unchanged from before)

| Secret            | Description |
| ----------------- | ----------- |
| `SERVER_HOST`     | Server IP or hostname |
| `SERVER_USER`     | SSH user with permission to run `docker` |
| `SERVER_PASSWORD` | SSH password |
| `SERVER_PORT`     | SSH port (optional; default `22` if omitted) |

### Optional deploy tuning

| Secret                   | Description |
| ------------------------ | ----------- |
| `DOCKER_CONTAINER_NAME`  | Container name (default `moaddi-next`) |
| `DOCKER_HOST_PORT`       | Host port mapped to app `3000` (default `3002`) |

## 2. Server prerequisites

1. **Docker Engine** installed and the SSH user can run `docker` (e.g. in the `docker` group, or use `sudo` by adjusting the workflow script).
2. **Public image** — no login needed on the server. For a **private** Hub repo, run `docker login` once on the server or extend the workflow to log in over SSH.
3. **Reverse proxy** — if you already terminate TLS on nginx/Caddy, point it at `127.0.0.1:DOCKER_HOST_PORT` (default `3002`).

## 3. Local Docker (optional)

From the repo root, after creating `.env.production` (not committed; matches production keys):

```bash
docker build -t moaddi-next:local .
docker run --rm -p 3002:3000 moaddi-next:local
```

## 4. Branch

Deploy runs on pushes to **`production`**. Merge into that branch to release.

## 5. Previous PM2 + git deploy

The old flow (git pull, `npm ci`, `npm run build`, `pm2 reload`) is replaced by this Docker pipeline. Keep `ecosystem.config.js` only if you still use PM2 elsewhere.
