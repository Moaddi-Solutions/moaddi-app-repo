# Production deploy (GitHub Actions)

Pushes to the `production` branch trigger [`.github/workflows/deploy.yml`](workflows/deploy.yml), which SSHs into your server, runs `git pull`, and `pm2 reload Server`.

## 1. GitHub repository secrets

In this repo: **Settings → Secrets and variables → Actions → New repository secret**, add:

| Secret              | Description                                      |
|---------------------|--------------------------------------------------|
| `SERVER_HOST`       | Server IP or hostname                            |
| `SERVER_USER`       | SSH user (e.g. `root`, `ubuntu`)                 |
| `SERVER_PASSWORD`   | SSH password (not your GitHub token)             |
| `SERVER_PORT`       | **SSH** port — usually `22`, not your app port   |
| `SERVER_PATH`       | Absolute path to this app on the server (e.g. `/home/ubuntu/server`) |
| `PM2_BIN` *(optional)* | Full path to the `pm2` binary from `which pm2` — only needed if the workflow still cannot find `pm2` after PATH fixes |

## 2. Server prerequisites (verify once)

1. **Repo cloned** at `SERVER_PATH` and remote tracks GitHub (`origin` → `mrsawy/moaddi-server` or your fork).
2. **`git pull` works without prompts** — deploy key or HTTPS + token on the server.
3. **PM2** — app already started from this directory, e.g.:
   - `pm2 start ecosystem.config.js --env production`
   - `pm2 save`
4. Process name must be **`Server`** (matches [`ecosystem.config.js`](../ecosystem.config.js)).
5. **Do not** start with `pm2 start npm -- start`. Use the ecosystem file so Node loads `tsx` (`--import tsx`) and can require `.ts` modules.

## 3. Branch

The workflow runs on pushes to **`production`**. Merge or push to that branch to deploy.

## 4. `pm2: command not found` in Actions (but works when you SSH manually)

Non-interactive SSH uses a small `PATH`. The workflow loads **nvm**, prepends **every** `~/.nvm/versions/node/*/bin` to `PATH`, adds **`npm config get prefix`/bin**, then tries (in order): secret **`PM2_BIN`**, `pm2` on `PATH`, `/usr/local/bin/pm2`, and **`node $(npm root -g)/pm2/bin/pm2`**.

If it still fails, run `which pm2` on the server and set **`PM2_BIN`** to that path.
