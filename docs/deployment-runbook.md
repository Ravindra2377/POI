# Production Deployment Runbook

`render.yaml` is the deployment contract; the authenticated Render dashboard is authoritative for
values Render does not expose declaratively (secrets, regions, database limits). This runbook does
not replace the release gates in `operations-and-recovery.md` — it assumes they have passed.

## Architecture

- `ap-civic-web` — Next.js server (not static export), `node` runtime, free plan.
  - Build: `npm ci && npm run build`.
  - Start: `npm run start --workspace=@ap-civic/web -- --hostname 0.0.0.0 --port $PORT`.
  - Health: `/api/health` (web route handler, no database dependency).
  - Server mode matters: per-seat Open Graph/Twitter card images are generated on request from
    `next/og`, and the launch page's `generateMetadata` resolves per request.
- `ap-civic-api` — Python FastAPI service, free plan.
  - Build: `pip install ./apps/api`.
  - Start: `cd apps/api && alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port $PORT`.
  - Readiness: `/health/ready` (also verifies the database connection).
- PostgreSQL — external Aiven service reached through the secret `DATABASE_URL` with TLS required.
  Record the active Aiven backup retention and point-in-time recovery terms, and take a fresh
  logical `pg_dump` before every migration or destructive operator step.

## Environment variables (set per environment in the dashboard)

These are `sync: false` in `render.yaml`, so they must be created manually:

| Service      | Key                             | Value                                                                                                                                                                                                                 |
| ------------ | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ap-civic-web | `NEXT_PUBLIC_API_URL`           | Public base URL of the API service (e.g. `https://ap-civic-api.onrender.com`)                                                                                                                                         |
| ap-civic-web | `NEXT_PUBLIC_SITE_URL`          | Public base URL of the web service (e.g. `https://ap-civic-web.onrender.com`); feeds `metadataBase` so generated `og:image` URLs are absolute. If unset, `RENDER_EXTERNAL_URL` is used, then `http://localhost:3000`. |
| ap-civic-api | `DATABASE_URL`                  | Rotated Aiven PostgreSQL service URI; retain `sslmode=require` and never commit or print it                                                                                                                           |
| ap-civic-api | `CORS_ORIGINS`                  | Comma-separated origins allowed by the API, including the web service public URL                                                                                                                                      |
| ap-civic-api | `COMMUNITY_SUBMISSIONS_ENABLED` | `false` for the public-data beta; changing this is a governed participation launch operation                                                                                                                          |

`APP_ENV=production` and the closed participation default are declared in the Blueprint. Runtime
`RENDER_EXTERNAL_URL` is set by Render for the web service.

## Deploy procedure

A Render `autoDeployTrigger: commit` redeploys both services on every push. For a controlled data
acceptance, do not rely on that alone:

1. Follow the ordered Stage 7 sequence in `operations-and-recovery.md` (pre-flight record, seed,
   operators in dependency order, catalogue verification, idempotency, public checks) inside one
   maintenance window. Operators run against `DATABASE_URL` on the API instance or an allowed host.
2. Trigger the API deployment first. On the free service, the start command runs
   `alembic upgrade head` before Uvicorn; the new revision must be `20260820_0007` at head.
3. After the API is healthy, trigger the web deployment.
4. Run the post-deploy verification matrix below.

Do not run `alembic downgrade` in production. Keep the additive schema and fix forward; restore a
verified copy into an isolated target only when a committed migration makes fix-forward unsafe, and
only under an explicit operator decision.

## Post-deploy verification matrix

- `GET /api/health` (web) and `GET /health/ready` (API) return HTTP 200.
- `GET /api/v1/community/participation-status` returns
  `{"submissions_enabled":false,"mode":"read_only"}`.
- `alembic current` reports head including `20260820_0007`.
- Catalogue endpoints return the documented reviewed production coverage: 36 States/UTs, 784
  districts, and 945 schemes nationally; Andhra Pradesh budget has 3,175 lines across 2014-2015
  through 2026-2027, with 533 officeholder and 531 election-result records.
- `published_source_observations` count equals the reviewed published total and excludes private
  columns (object storage keys, reviewer identities).
- Both-language searches return HTTP 200 (the search test fixtures exercise Telugu and English).
- Launch page: `/know-your-constituency` and, with query params, `/know-your-constituency?district=Srikakulam&seat=srikakulam`
  render the profile card and per-request metadata.
- Share previews: fetch the `og:image` URL from the rendered page and confirm a 1200x630 PNG; test
  at least one per-seat URL (`/know-your-constituency/opengraph-image?seat=<slug>`) since the route
  is `force-dynamic`. WhatsApp/Telegram caches must be busted with their share-debugger/URL
  scrapers; the generic card is served at `/opengraph-image`.
- Community flow: `/community` and `/account` display the bilingual public-data-beta notice;
  report, review, poll-vote, evidence, and profile controls are disabled. Direct POST requests to
  citizen mutation routes return 403, while published content and the audit log remain readable.

## Rollback criteria

- Migration pre-deploy failure before commit: preserve the error, fix on a disposable copy, retry in
  a new window. Never downgrade.
- Committed-migration defect: fix forward with an additive migration; use a fresh `pg_dump` +
  isolated restore only if data corruption makes fix-forward unsafe.
- Switch production to a restored database only on explicit operator decision, then re-run the
  verification matrix.

## Remaining production gaps

Private object storage (raw snapshots currently write to a local `storage/` directory), provider
restore drill, LGD access review, and the monitoring/budget-owner checklist in
`operations-and-recovery.md` all remain external gates before raw network ingestion is production
safe.

## Bootstrap the first administrator

After revision `20260820_0007` is active, open a trusted shell on the API service and run:

```bash
cd apps/api
python -m app.commands.create_admin \
  --email admin@example.org \
  --display-name "Platform administrator"
```

Enter the password only at the hidden prompt. The policy requires at least 14 characters and three
character categories. The command refuses an existing email and records the bootstrap as an audit
event. Visit `/admin` on the web service to sign in. Create moderators there with temporary
passwords, deliver those passwords through a separate secure channel, and require each moderator to
change the password before accessing the queue.

The administrator overview must load the all-status community-content inventory, staff directory,
and recent audited actions. Confirm that a moderator session cannot load
`/api/v1/community/admin/content` or `/api/v1/staff/accounts`; these are administrator-only even
though moderators can access the pending/flagged queue and perform audited moderation transitions.

Post-deploy checks must confirm that unauthenticated requests to the moderation queue and action
endpoint fail, a moderator cannot create staff accounts, an administrator can create a moderator,
temporary-password accounts cannot moderate, and a moderation transition updates the target and
creates exactly one audit record. For the public-data beta, first prove direct citizen writes return 403. Test the pending-to-published workflow only in a controlled maintenance window by temporarily
setting `COMMUNITY_SUBMISSIONS_ENABLED=true`, using a clearly labelled synthetic report, approving
it with a recorded reason, confirming exactly one audit record, and returning the flag to `false`.
A production database failure must return 503 and must not create in-memory content.
