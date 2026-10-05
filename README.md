# ToolHub

All-in-one online tools platform (see the Master Plan). npm workspaces monorepo:

| Path | What |
|---|---|
| `apps/web` | Next.js 15 app — tool pages, API routes (`/api/upload`, `/api/jobs`, `/api/net/*`) |
| `apps/worker` | BullMQ worker (LibreOffice, Ghostscript, qpdf, OCRmyPDF, FFmpeg, rembg, sharp) |
| `packages/registry` | Tool registry — single source of truth for pages, sitemap, search, API validation |
| `packages/server-common` | Queue/S3 helpers shared by web and worker |
| `packages/db` | Prisma schema for Phase 4 (accounts, usage, billing) — not wired yet |

## Run
```bash
npm install
npm run dev                      # web on :3000 — instant + client tools work with nothing else running

# server tools (Phase 3):
docker compose up --build        # redis, minio, worker (worker has no internet access)
cp .env.example apps/web/.env.local
```
Network tools (DNS, SSL, headers, SPF/DMARC, IP) only need the web app.

## Adding a tool
1. Add an entry in `packages/registry/src/tools/index.ts`.
2. Add a component in `apps/web/processors/<group>/` and list its slug in `apps/web/processors/index.ts`.
   Server tools also need a processor in `apps/worker/src/processors/index.ts`.

## Security notes
Worker: magic-byte type checks, `execFile` with arg arrays, Ghostscript `-dSAFER`, per-job LibreOffice profile, FFmpeg protocol whitelist, hard timeout, read-only container on an internal-only network.
Net tools: every connection resolves DNS through a guard that rejects private/loopback/link-local/metadata addresses, re-checked on every redirect.
