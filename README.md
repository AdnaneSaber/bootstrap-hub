# Bootstrap Hub

A self-hosted web dashboard for building, signing, and distributing Windows application bundles, browser extension policies, and startup configuration scripts.

- **Public URL:** https://bootstrap-hub.qwik.ma
- **Local URL:** http://localhost:18797
- **Default admin:** `admin@bootstrap.hub` / `ChangeMe123!`

## Tech Stack

- [Next.js 15/16](https://nextjs.org/) App Router
- [React 19](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS v4](https://tailwindcss.com/)
- [Prisma](https://www.prisma.io/) + PostgreSQL
- [NextAuth.js v4](https://next-auth.js.org/) credentials provider
- [Zod](https://zod.dev/) request validation
- [Archiver](https://www.archiverjs.com/) for ZIP bundles
- [Lucide React](https://lucide.dev/) icons

## Features

- Role-based access control (`ADMIN`, `OPERATOR`, `VIEWER`)
- Application catalog with install methods (`EXE`, `MSI`, `ZIP`, `PORTABLE`, `WINGET`, `CHOCO`)
- Browser extension catalog (`CHROME`, `BRAVE`, `EDGE`)
- Startup action editor (`EXECUTE`, `POWERSHELL`, `CMD`, `URL`)
- Signed ZIP bundle builder with a generated PowerShell installer
- File uploads with SHA-256 verification, stored on disk (default `/data/bootstrap-hub`)
- Server-side downloading of application installers referenced by URL
- Audit logging for every mutation
- Optional AI agent for deployment review and Q&A (requires `OPENAI_API_KEY`)

## Quick Start

From the repository root:

```bash
cp .env.example .env
# Edit .env and set strong NEXTAUTH_SECRET and BUNDLE_SECRET values
nano .env

docker compose up -d --build
```

The `web` container waits for PostgreSQL to become healthy, then applies migrations and seeds the default admin user.

Open https://bootstrap-hub.qwik.ma (or http://localhost:18797) and sign in with the default admin credentials.

> Change the default admin password and secrets before production use.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql://bootstrap:bootstrap@postgres:5432/bootstrap_hub` | PostgreSQL connection string |
| `NEXTAUTH_URL` | `http://localhost:18797` | Public base URL used by NextAuth |
| `NEXTAUTH_SECRET` | *(required)* | Random string, min 32 characters |
| `BUNDLE_SECRET` | *(required)* | Secret used to sign bundle manifests |
| `OPENAI_API_KEY` | *(empty)* | Optional OpenAI-compatible API key |
| `ADMIN_PASSWORD` | `ChangeMe123!` | Password for the seeded admin user |
| `HOST_PORT` | `18797` | Host port mapped to the container |
| `STORAGE_ROOT` | `/data/bootstrap-hub` | On-disk location for uploads, bundles, and downloaded assets |

Generate secrets with:

```bash
openssl rand -base64 32
```

## Project Layout

```text
/home/ubuntu/bootstrap-hub/
├── apps/web/            # Next.js application
│   ├── app/             # App Router routes
│   ├── components/      # Shared UI components
│   ├── lib/             # Shared libraries (prisma, auth, rbac, audit, crypto, paths)
│   ├── prisma/          # Prisma schema and seed
│   ├── public/          # Static assets
│   ├── Dockerfile       # Production container image
│   └── package.json
├── docker-compose.yml   # Local / server orchestration
├── .env.example         # Environment template
├── README.md            # This file
└── DEPLOY.md            # Deployment, tunnel, and troubleshooting guide
```

## API Summary

All API routes except `/api/auth/*` and `/api/health` require a valid NextAuth session cookie.
Mutations require `ADMIN` or `OPERATOR` role where noted.

| Method | Route | Access | Description |
|--------|-------|--------|-------------|
| GET | `/api/health` | Public | Health check |
| GET/POST | `/api/applications` | Read: any / Write: ADMIN/OPERATOR | List or create applications |
| GET/PATCH/DELETE | `/api/applications/:id` | Read: any / Write: ADMIN/OPERATOR | Application detail, update, delete |
| GET/POST | `/api/extensions` | Read: any / Write: ADMIN/OPERATOR | List or create extensions |
| GET/PATCH/DELETE | `/api/extensions/:id` | Read: any / Write: ADMIN/OPERATOR | Extension detail, update, delete |
| GET/POST | `/api/startup-actions` | Read: any / Write: ADMIN/OPERATOR | List or create startup actions |
| GET/PATCH/DELETE | `/api/startup-actions/:id` | Read: any / Write: ADMIN/OPERATOR | Startup action detail, update, delete |
| GET/POST | `/api/files` | Read: any / Write: ADMIN/OPERATOR | List or upload files (multipart) |
| DELETE | `/api/files/:id` | ADMIN/OPERATOR | Delete an uploaded file |
| GET/POST | `/api/bundles` | Read: any / Write: ADMIN/OPERATOR | List or build bundles |
| GET/DELETE | `/api/bundles/:id` | Read: any / Delete: ADMIN/OPERATOR | Bundle detail or delete |
| GET | `/api/bundles/:id/download` | Any authenticated | Download the signed ZIP bundle |
| GET | `/api/audit-logs` | Any authenticated | Paginated audit log |
| POST | `/api/ai-agent` | Any authenticated (`review` requires ADMIN/OPERATOR) | AI query/review (when configured) |

Example using `curl` with an active session cookie:

```bash
# List applications
curl -b cookies.txt https://bootstrap-hub.qwik.ma/api/applications

# Create an application (ADMIN/OPERATOR)
curl -b cookies.txt -X POST https://bootstrap-hub.qwik.ma/api/applications \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Brave Browser",
    "category": "Browser",
    "installMethod": "WINGET",
    "silentInstallCommand": "Brave.Brave",
    "detectionMethod": "FILE",
    "detectionRule": { "path": "${env:ProgramFiles}\\BraveSoftware\\Brave-Browser\\Application\\brave.exe" }
  }'

# Build a bundle (ADMIN/OPERATOR)
curl -b cookies.txt -X POST https://bootstrap-hub.qwik.ma/api/bundles \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Gaming Setup",
    "applicationIds": ["<app-id-1>", "<app-id-2>"],
    "extensionIds": ["<ext-id-1>"],
    "startupActionIds": []
  }'

# Download the bundle
curl -b cookies.txt -L \
  "https://bootstrap-hub.qwik.ma/api/bundles/<bundle-id>/download" \
  -o setup.zip
```

## PowerShell Bootstrap Usage

A bundle is a signed ZIP archive containing:

```text
manifest.json        # Bundle descriptor (also included as config.json)
config.json          # Same bundle descriptor for easy consumption
manifest.sig         # HMAC-SHA256 signature
bootstrap.ps1        # Generated PowerShell installer
bootstrap.cmd        # Windows CMD wrapper that bypasses execution-policy blocks
files/               # Uploaded installer files referenced by applications
```

Bundles are cached by selection. Requesting the same combination of apps, extensions, and startup actions returns the existing bundle instead of creating a duplicate.

On a Windows target machine, download and run the bundle:

```powershell
# Download the bundle (use the real bundle ID)
$bundleUrl = "https://bootstrap-hub.qwik.ma/api/bundles/<bundle-id>/download"
Invoke-WebRequest -Uri $bundleUrl -OutFile "$env:TEMP\bootstrap-hub-setup.zip" -UseBasicParsing

# Extract
Expand-Archive -Path "$env:TEMP\bootstrap-hub-setup.zip" -DestinationPath "$env:TEMP\bootstrap-hub-setup" -Force

# Option 1 (recommended): run the CMD wrapper as Administrator
& "$env:TEMP\bootstrap-hub-setup\bootstrap.cmd"

# Option 2: run the PowerShell script directly, bypassing execution policy
powershell -ExecutionPolicy Bypass -File "$env:TEMP\bootstrap-hub-setup\bootstrap.ps1" -LogPath "$env:ProgramData\BootstrapHub\install.log"
```

To skip signature verification (not recommended for production):

```powershell
powershell -ExecutionPolicy Bypass -File "$env:TEMP\bootstrap-hub-setup\bootstrap.ps1" -SkipSignatureCheck -LogPath "$env:ProgramData\BootstrapHub\install.log"
```

The installer:

1. Verifies the manifest signature against `manifest.sig`.
2. Installs each application using its configured method (`EXE`, `MSI`, `ZIP`, `WINGET`, `CHOCO`, or `PORTABLE`).
3. Skips applications that are already detected by registry, program list, or file path.
4. Applies browser extension policies for Chrome, Brave, and Edge.
5. Runs enabled startup actions in order.
6. Writes progress to the configured log path.

## Scripts

Inside `apps/web`:

| Script | Description |
|--------|-------------|
| `npm run dev` | Start the development server |
| `npm run build` | Build for production |
| `npm run start` | Start the production server |
| `npm run lint` | Run ESLint |
| `npm run db:generate` | Regenerate Prisma Client |
| `npm run db:migrate` | Create/apply migrations in dev |
| `npm run db:deploy` | Apply migrations in production |
| `npm run db:seed` | Seed the default admin user |

## RBAC Summary

| Role | Permissions |
|------|-------------|
| `ADMIN` | Full access: users, apps, extensions, startup actions, bundles, uploads |
| `OPERATOR` | Can create/update/delete entities; read-only on users |
| `VIEWER` | Read-only across the app |

Every create/update/delete action is recorded in the `AuditLog` table via `logAudit()`.

## Deployment

See [DEPLOY.md](./DEPLOY.md) for Docker, Docker Compose, Cloudflare tunnel, backup/restore, and troubleshooting instructions.
