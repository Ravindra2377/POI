# Architecture

## Decision status

Stage 1 is accepted. Stage 2A/2B passes disposable PostgreSQL/PostGIS integration and awaits
production restore and deployment proof. Revisit infrastructure choices only when measured load, operational limits, or a stage
requirement provides evidence.

## System context

The live system currently exposes reviewed Andhra Pradesh Stage 1 records through FastAPI and
Next.js. The local Stage 2A/2B schema defines source-specific acquisition, immutable raw-snapshot
metadata, extraction runs, observations, review decisions, and corrections, but acquisition workers
and raw object storage are not yet implemented or deployed.

Future community submissions will flow through private storage and moderation before any public

## Monorepo boundaries

- `apps/web`: rendering, accessibility, localization, public interaction, and web health
- `apps/api`: API contracts, authorization boundary, business rules, and API health
- `workers/ingestion`: source acquisition and immutable snapshot creation
- `workers/extraction`: format-specific parsing and observation candidates
- `workers/verification`: review queues and reconciliation jobs
- `packages/database`: future migrations and database tooling
- `packages/shared-types`: cross-boundary contracts that are safe to share
- `packages/ui`: reusable presentational components
- `packages/localization`: locale catalogs and bilingual field helpers

Workers may create candidate observations but must not directly publish user-facing official facts.

## Data layers

1. **Raw:** immutable source files, retrieval metadata, checksums, and access conditions.
2. **Normalized:** append-only sources, observations, government entities, financial events, and
   geographic relationships.
3. **Presentation:** calculations, explanations, search documents, freshness indicators, and
   public community projections.

Corrections append records that supersede earlier observations. They never delete the source
history.

## Runtime

- Next.js 16 with TypeScript for the web application
- FastAPI with Python 3.12 for the API and future extraction code
- Render PostgreSQL with PostGIS for relational and geographic data
- S3-compatible private object storage is required before Stage 2C; provider selection is pending
- PostgreSQL full-text search initially; external search only after measured need

## API conventions

- `/health/live` reports process health; `/health/ready` verifies PostgreSQL and PostGIS.
- Stage 1 collection endpoints use numbered pagination, stable ordering, stable UUIDs, explicit
  locale fields, and filtering.
- Public schemas exclude private evidence, contact information, consent records, and abuse signals.
- The API must return evidence class, source links, observation dates, and review status alongside
  government claims.

## Architecture decisions

### ADR-001: modular monorepo

Use npm workspaces for TypeScript packages and a standard Python package. This keeps one
review surface without coupling frontend and backend release artifacts.

### ADR-002: append-only observations

Represent changing public records as time-bounded observations rather than mutable entity columns.
This preserves discrepancies and revisions as auditable information.

### ADR-003: coarse user geography

My Area uses a selected district and mandal. Exact location is neither required nor exposed.
Project geometry is public-government information and is governed separately from user location.

### ADR-004: source-specific adapters

Each source gets an adapter, fixture, mapping, retry policy, and tests. A universal scraper would
hide source-specific failure and silently degrade provenance.

## Deployment shape

Render deploys the web and API as separate native web services and provisions managed PostgreSQL
from `render.yaml`. Workers and private object storage will be added only when their stages require
them. Production must use managed secrets, TLS, backups, private evidence storage, network
isolation, and monitored restore drills.

## Stage 1 data foundation

SQLAlchemy 2 models and Alembic revisions live with the API. The initial revision enables PostGIS
idempotently, stops with a clear privilege error if the extension cannot be enabled, and creates
native spatial columns and GIST indexes. Render runs migrations before deployment; seeds are a
separate operator action.

`/health/live` tests only the API process. `/health/ready` performs read-only database and PostGIS
extension checks. Public catalog APIs are versioned under `/api/v1`, paginated, stably ordered,
and expose provenance summaries rather than internal storage fields. See
[entity relationships](entity-relationships.md) for the Stage 1 model.

## Stage 2 provenance foundation

The additive Stage 2 revision introduces registered sources, stable documents, immutable snapshot
metadata, versioned extraction runs, typed append-only observations, immutable review decisions,
correction links, and a reviewed-only public database projection. Raw bytes belong in private
S3-compatible object storage; PostgreSQL stores their checksum and object metadata only.

The Stage 1 `source_references` bridge remains operational. Existing source UUIDs are preserved in
the richer chain, and existing public APIs remain compatible while later endpoints are designed.
See [the provenance contract](provenance-contract.md) and
[operations and recovery](operations-and-recovery.md).
