# Viksit Bharat??

An India-wide public intelligence and civic participation platform, launching with Andhra Pradesh.
The product connects official records, platform calculations, and structured community experience
while keeping those evidence classes visibly and technically separate.

Stage 1 adds the PostgreSQL/PostGIS geography and government-entity foundation, versioned read-only
APIs, and a bilingual Government Explorer. Projects, financial observations, citizen reports,
polls, eligibility decisions, and production ingestion remain outside this stage.

Stage 2 provenance schema development is in progress; network ingestion remains gated by the
documented database, recovery, object-storage, and source-access checks.

The website exposes reviewed national district and scheme catalogues, Andhra Pradesh-scoped budget,
officeholder and election data, prepared or gated project/public-money/procurement catalogues, a
coarse area briefing at `/my-area`, pseudonymous citizen preferences at `/account`, and structured
community participation at `/community`. Official, calculated, inferred and community-reported
values remain visibly separate. Public Money keeps the eleven financial stages distinct;
Procurement keeps tender estimates, awards, values and outcomes distinct; and Officeholders keeps
roles and terms distinct from judgements about a person.

Community reports and comments enter `pending_review` and are not public until an authenticated
moderator approves them. Staff use separate admin/moderator accounts at `/admin`; citizen
pseudonyms cannot become staff authority. Administrators additionally receive a protected overview
of all recent content states, the staff directory, and recent audited actions; moderators receive
the review queue only. Every moderation transition creates an audit record, and the public audit log
hides internal staff identity. Polls remain non-representative by contract and no fabricated
fallback polls or vote counts are served. Production community writes fail closed when PostgreSQL is
unavailable; pending records are never served by public fallback paths. Precise user location is
never collected.

## Prerequisites

- Node.js 22+ and npm 12+
- Python 3.12+ with pip
- PostgreSQL with permission to enable the PostGIS extension
- A Render account for deployment

## Run locally

Install and start the web application:

```bash
npm install
npm run dev:web
```

In another shell, install and start the API:

```bash
python3 -m venv .venv
.venv/bin/python -m pip install -e './apps/api[dev]'
cd apps/api
../../.venv/bin/uvicorn app.main:app --reload --port 8000
```

Open the web app at <http://localhost:3000>, the API at <http://localhost:8000>, and API
documentation at <http://localhost:8000/docs>.

Set `DATABASE_URL` before database operations. Check PostGIS privileges, migrate, then seed the
reviewed Stage 1 baseline separately:

```bash
cd apps/api
../../.venv/bin/python -m app.commands.preflight
../../.venv/bin/alembic upgrade head
../../.venv/bin/python -m app.commands.seed
```

The seed is deterministic, idempotent, and safe to rerun. It is intentionally not part of an
Alembic revision or application startup. To exercise empty-database migration and seed reruns, set
`TEST_DATABASE_URL` to a disposable PostgreSQL/PostGIS database whose name contains `_test`, then
run Pytest.

## Quality commands

Install JavaScript dependencies once for host-side checks:

```bash
npm install
```

Then run:

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
```

Run API checks from `apps/api` after installing the development extra:

```bash
ruff check --no-cache .
mypy --no-incremental app tests
pytest -p no:cacheprovider
```

With both services running, verify their public health endpoints using `npm run healthcheck`.

## Deploy to Render

`render.yaml` defines two native web services and one managed PostgreSQL database. Create a new
Render Blueprint from the repository, then provide the two prompted values:

- `NEXT_PUBLIC_API_URL`: the public HTTPS URL Render assigns to `ap-civic-api`
- `CORS_ORIGINS`: the public HTTPS origin Render assigns to `ap-civic-web`

The API uses Render's `starter` plan because Blueprint pre-deploy commands are not available on a
free web service. `alembic upgrade head` runs as a pre-deploy command, so a failed migration blocks
the release. The service health check uses `/health/ready`; `/health/live` remains a process-only
probe. `DATABASE_URL` comes from the managed database and is never committed. Run the seed manually
after a successful deployment; do not add it to the start or pre-deploy command.

For a failed migration, preserve the database, inspect `alembic current` and Render's pre-deploy
logs, and fix forward with a reviewed revision. Restore a managed backup before any destructive
recovery. Use `alembic downgrade` only when that revision's downgrade has been tested on a copy.

## Repository map

- `apps/web`: Next.js citizen-facing application
- `apps/api`: FastAPI service
- `workers`: future ingestion, extraction, and verification workers
- `packages`: shared database, types, UI, and localization packages
- `data`: non-production fixtures and schema contracts
- `infrastructure`: deployment documentation
- `docs`: product, architecture, governance, moderation, security, sources, and roadmap
- `tests`: future cross-service integration and end-to-end suites

## Current limitations

- No authoritative boundary geometry has been loaded; geography records deliberately allow null
  geometry and the explorer says so.
- The requested baseline has 26 districts. Markapuram and Polavaram are published separately by the
  network-ingestion district feed, which stores the raw LGD and AP State Portal responses as
  immutable snapshots and records every review as an audit decision.
- No mandals, villages, constituencies, representatives, projects, or public offices are seeded.
- Community participation requires production migration, initial-admin bootstrap, operational moderation staffing, abuse controls, appeals, and legal review before unrestricted opening.
- The `/ingestion` page reports only feeds whose source is marked `api_endpoint`; it is a public
  status view of the district feed pipeline and does not serve raw snapshot contents or disclose
  reviewer identities.
- Telugu copy and names need professional language review before public release.
- Stage 2 raw ingestion is blocked until the disposable database run, restore drill, private
  object-storage choice and cost limits, and LGD access review are recorded.
- Stage 1 legacy sources do not have retained raw bytes; the backfill labels this explicitly.

See the [complete cumulative development record](DEVELOPMENT.md),
[entity relationships](docs/entity-relationships.md), and [roadmap](docs/roadmap.md).
