# ToolHub — PDF tools

A focused, privacy-first PDF toolkit: most tools run **in the browser**; heavier jobs run on an isolated **worker**; AI tools send only extracted text to Claude.
npm-workspaces monorepo:

| Path | What |
|---|---|
| `apps/web` | Next.js 15 app — pages, API routes (`/api/upload`, `/api/jobs`, `/api/ai/*`, `/api/billing/*`, `/api/webhooks/payments`, `/api/v1/*`) |
| `apps/worker` | BullMQ worker (LibreOffice, Ghostscript, qpdf, OCRmyPDF, FFmpeg, rembg, sharp) in a locked-down container |
| `packages/registry` | Tool registry — single source of truth (30 listed PDF tools; other tools stay in code but are `hidden`) |
| `packages/server-common` | Queue/S3 helpers shared by web and worker |
| `packages/db` | Prisma schema + migrations (users, plans, usage, credits, jobs, API keys) |
| `extension/` | Chrome extension (popup with tool search; no permissions) |

## Run locally
```bash
npm install
cp .env.example apps/web/.env.local          # fill DATABASE_URL, AUTH_SECRET, AUTH_DEV_LOGIN=1 for local sign-in
npm run db:deploy                            # apply Prisma migrations to your Postgres
npm run dev                                  # http://localhost:3000 — in-browser tools work immediately

docker compose up --build                    # redis + minio + worker, for server tools
```
- **Accounts:** Google and/or email link (see `.env.example`). `AUTH_DEV_LOGIN=1` enables a passwordless demo login in development only.
- **Billing:** Lemon Squeezy — set the API key, store id, variant ids and webhook secret; point the webhook at `/api/webhooks/payments` (events: subscription_*, order_created, order_refunded).
- **AI tools:** set `ANTHROPIC_API_KEY`. Default model is `claude-opus-5-5`; override with `AI_MODEL` (e.g. `claude-sonnet-5-5` for lower cost). `AI_MOCK=1` returns canned output for demos/tests.
- **Extension:** `SITE_URL=https://your-site npx tsx scripts/build-extension.ts`, then load `extension/` unpacked.

## Adding a tool
1. Add an entry in `packages/registry/src/tools/` and a group in `packages/registry/src/index.ts` (`GROUP_OF`).
2. Add a component under `apps/web/processors/<group>/` and list its slug in `apps/web/processors/index.ts`. Server tools also need a processor in `apps/worker/src/processors/index.ts`.

## Security notes
Worker: magic-byte type checks, `execFile` with arg arrays, Ghostscript `-dSAFER`, per-job LibreOffice profile, FFmpeg protocol whitelist, hard timeout, read-only container on an internal-only network. Job ids are unguessable UUIDs; downloads use short-lived signed URLs.
Webhooks: HMAC-verified over the raw body and idempotent. API keys: shown once, stored as SHA-256 hashes. Credits are spent atomically and refunded on failure or refusal.
