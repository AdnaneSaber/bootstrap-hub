# Deployment Guide

This document covers running Bootstrap Hub with Docker Compose and exposing it through the configured Cloudflare tunnel.

- **Public URL:** https://bootstrap-hub.qwik.ma
- **Container port:** `3000`
- **Host port:** `18797`
- **Project root:** `/home/ubuntu/bootstrap-hub`

## Quick Start with Docker Compose

From the repository root:

```bash
cp .env.example .env
# Edit .env and set strong NEXTAUTH_SECRET and BUNDLE_SECRET values
nano .env

docker compose up -d --build
```

The `web` container waits for PostgreSQL to become healthy, then runs:

```text
npx prisma migrate deploy
npx prisma db seed
node server.js
```

The default admin user is created on first start if it does not exist.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql://bootstrap:bootstrap@postgres:5432/bootstrap_hub` | PostgreSQL connection string |
| `NEXTAUTH_URL` | `http://localhost:18797` | The public base URL used by NextAuth |
| `NEXTAUTH_SECRET` | *(required)* | Random string, min 32 characters |
| `BUNDLE_SECRET` | *(required)* | Secret used to sign bundle manifests |
| `OPENAI_API_KEY` | *(empty)* | Optional OpenAI integration key |
| `ADMIN_PASSWORD` | `ChangeMe123!` | Password for the seeded admin user |
| `HOST_PORT` | `18797` | Host port mapped to the container |
| `STORAGE_ROOT` | `/data/bootstrap-hub` | Host path mounted into the container for uploads, bundles, and downloaded assets |

### Generating secrets

```bash
openssl rand -base64 32
```

Generate two separate values for `NEXTAUTH_SECRET` and `BUNDLE_SECRET`, then update `.env`.

### Storage

Uploads, generated bundles, and application installers downloaded from URLs are stored under `STORAGE_ROOT` (default `/data/bootstrap-hub`). The directory is bind-mounted into the container, so data survives container recreation. Ensure the host path has enough free space and is backed up.

```text
/data/bootstrap-hub/
├── uploads/   # Uploaded installer files and server-side downloads
├── bundles/   # Generated ZIP bundles
└── cache/     # Working cache
```

### Using a remote PostgreSQL server

Set `DATABASE_URL` to the external connection string and remove or adjust the `postgres` service in `docker-compose.yml`. Keep the `depends_on` condition if you remove the local database.

## Cloudflare Tunnel

The app is exposed through the existing `oracle-services` tunnel.

The ingress entry has been added to `/etc/cloudflared/config.yml`:

```yaml
- hostname: bootstrap-hub.qwik.ma
  service: http://localhost:18797
```

### Validate and reload

```bash
cloudflared tunnel --config /etc/cloudflared/config.yml ingress validate
sudo systemctl restart cloudflared
```

### Route DNS (if needed)

```bash
cloudflared tunnel route dns oracle-services bootstrap-hub.qwik.ma
```

### Verify the tunnel

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:18797/api/health
curl -s -o /dev/null -w "%{http_code}\n" https://bootstrap-hub.qwik.ma/api/health
```

Both should return `200`.

## Manual Docker Build

If you prefer to build and run the image directly:

```bash
cd apps/web
docker build -t bootstrap-hub-web .

docker run -d \
  --name bootstrap-hub-web \
  -p 18797:3000 \
  -e DATABASE_URL=postgresql://bootstrap:bootstrap@postgres:5432/bootstrap_hub \
  -e NEXTAUTH_URL=http://localhost:18797 \
  -e NEXTAUTH_SECRET=<secret> \
  -e BUNDLE_SECRET=<secret> \
  -e ADMIN_PASSWORD=ChangeMe123! \
  -v bootstrap-hub-uploads:/app/uploads \
  -v bootstrap-hub-bundles:/app/bundles \
  --restart unless-stopped \
  bootstrap-hub-web
```

## Production Checklist

- [ ] Change `NEXTAUTH_SECRET` from the default.
- [ ] Change `BUNDLE_SECRET` from the default.
- [ ] Change the default admin password after first login.
- [ ] Use a strong `ADMIN_PASSWORD` env var for fresh deployments.
- [ ] Back up the `uploads` and `bundles` volumes regularly.
- [ ] Back up the PostgreSQL `pgdata` volume.
- [ ] Ensure the PostgreSQL password is strong.
- [ ] Run `docker compose pull` and `docker compose up -d --build` to update.

## Backup and Restore

### Volumes

```bash
# Backup
docker run --rm -v bootstrap-hub_pgdata:/data -v $(pwd):/backup alpine tar czf /backup/pgdata.tar.gz -C /data .
docker run --rm -v bootstrap-hub_uploads:/data -v $(pwd):/backup alpine tar czf /backup/uploads.tar.gz -C /data .
docker run --rm -v bootstrap-hub_bundles:/data -v $(pwd):/backup alpine tar czf /backup/bundles.tar.gz -C /data .

# Restore (example for uploads)
docker run --rm -v bootstrap-hub_uploads:/data -v $(pwd):/backup alpine sh -c "cd /data && tar xzf /backup/uploads.tar.gz"
```

### Database dump

```bash
# Backup
docker exec bootstrap-hub-postgres-1 pg_dump -U bootstrap bootstrap_hub > bootstrap_hub.sql

# Restore
cat bootstrap_hub.sql | docker exec -i bootstrap-hub-postgres-1 psql -U bootstrap bootstrap_hub
```

## Troubleshooting

### Container fails to start

Check logs:

```bash
docker compose logs -f web
```

Common issues:

- PostgreSQL not healthy: wait for the health check to pass.
- Missing secrets: ensure `NEXTAUTH_SECRET` and `BUNDLE_SECRET` are set.
- Port conflict: verify nothing else is using `18797` on the host.
- Migration failure: check that `DATABASE_URL` is reachable from the container.

### Health check fails

The web container health check calls `http://127.0.0.1:3000/api/health`. Verify from inside the container:

```bash
docker exec -it bootstrap-hub-web-1 wget -qO- http://127.0.0.1:3000/api/health
```

### Cloudflare returns 404

- Confirm the ingress entry exists in `/etc/cloudflared/config.yml`.
- Confirm `cloudflared` is running: `sudo systemctl status cloudflared`.
- Run `cloudflared tunnel --config /etc/cloudflared/config.yml ingress validate`.
- Confirm DNS points to the tunnel: `cloudflared tunnel route dns oracle-services bootstrap-hub.qwik.ma`.

### Build fails

From `apps/web`:

```bash
npm ci
npx prisma generate
npx tsc --noEmit
npm run lint
node run-build.js
```

Fix any TypeScript or lint errors before rebuilding the image.

### Reset local data

> **Warning:** This deletes all local data.

```bash
docker compose down -v
docker compose up -d --build
```
