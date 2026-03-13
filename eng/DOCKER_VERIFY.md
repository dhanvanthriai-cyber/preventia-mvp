# Podman Setup — Project Dhanvanthri
**Platform:** macOS (Podman Desktop)

## Stack

| Tool | Purpose |
|------|---------|
| Podman Desktop | Container runtime (Docker-compatible, rootless) |
| `podman compose` | Compose orchestration (built-in, Podman v4.7+) |
| `Dockerfile` | OCI-compliant — works with Podman unchanged |

## Quick Start

```zsh
# 1. Start Podman machine (once per reboot, or via Podman Desktop UI)
podman machine start

# 2. One-time: log in to Docker Hub so Podman can pull public images
#    Use your Docker Hub username + a Personal Access Token (PAT)
#    Create a PAT at: https://hub.docker.com/settings/security
podman login docker.io

# 3. From the eng/ directory — build image + start all three services
cd /Users/satishjonnala/Documents/Dhanvantri/dhanvanthri-mvp/eng
podman compose up --build -d

# 4. Watch Spring Boot logs
podman compose logs -f app

# 5. Verify health
curl http://localhost:8080/actuator/health
# → {"status":"UP"}
```

## Service Ports

| Service  | Port  | Container name        |
|----------|-------|-----------------------|
| Spring Boot API | 8080 | dhanvanthri-app  |
| PostgreSQL 16   | 5432 | dhanvanthri-postgres |
| Redis 7         | 6379 | dhanvanthri-redis    |

## Useful Commands

```zsh
podman compose ps              # container status
podman compose down            # stop all services
podman compose down -v         # stop + wipe volumes (clean DB slate)
podman compose restart app     # restart Spring Boot only (no rebuild)
podman compose build app       # rebuild image after code changes
podman compose logs -f app     # follow Spring Boot logs
podman exec -it dhanvanthri-postgres psql -U dhan_dev -d dhanvanthri_db
```

## Scripts

| Script | Purpose |
|--------|---------|
| `zsh restart.sh` | Full rebuild + restart (default) |
| `zsh restart.sh --infra` | Restart postgres + redis only, skip app rebuild |
| `zsh restart.sh --logs` | Restart + tail logs |
| `zsh start-redis.sh` | Start Redis standalone only |

## Notes
- `Dockerfile` is OCI-compliant — **no changes needed** for Podman
- `mem_limit` replaces `deploy.resources.limits` (Swarm-only, unsupported by `podman compose`)
- `version:` field removed from `docker-compose.yml` (deprecated in Compose v2+)
- All image references are fully qualified (`docker.io/library/...`) to avoid Podman's ambiguous-name error
- `~/.config/containers/containers.conf` sets `compose_providers = []` — disables Podman's external `docker-compose` delegation so `podman compose` uses the built-in engine
- Docker Hub requires a **Personal Access Token (PAT)** for pulls — run `podman login docker.io` once
