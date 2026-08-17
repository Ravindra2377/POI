# Pre-Stage 2 Operations and Recovery

## Current status

The production database and PostGIS readiness have been observed, but backup retention, restore
success, database monitoring, and object-storage selection remain unproven. The disposable Stage 1
to Stage 2 migration, compatibility backfill, double seed, downgrade/re-upgrade, and concurrency path
passed locally on PostgreSQL 16.9/PostGIS 3.5.2. This is not production deployment or restore evidence.
The same disposable database was logically backed up and restored into a separate
`india_stage2_restore_test` database; revision, counts, compatibility UUID sets, validated constraints,
and public projection matched. This proves local restore mechanics only, not provider backup recovery.

## Disposable migration and double-seed check

Use a dedicated PostgreSQL/PostGIS database whose name contains `_test`. Never point this procedure
at production.

```bash
cd apps/api
export TEST_DATABASE_URL='postgresql+psycopg://.../ap_civic_stage2_test'
../../.venv/bin/alembic upgrade head
../../.venv/bin/pytest -p no:cacheprovider tests/integration/test_postgres_stage1.py
```

The integration test refuses names without `_test`, migrates to Stage 1, runs the Stage 1 seed,
upgrades to Stage 2, runs the seed twice more, and requires zero creations on both reruns. It verifies
all 28 Stage 1 source UUIDs in every compatibility table, reviewed catalog searches, honest legacy
raw-unavailable status, downgrade/re-upgrade, append-only rejection, single-head concurrent review,
concurrent snapshot/correction duplicate rejection, reviewed publication, latest-decision enforcement,
invalid corrections, and correction chains longer than one level.

Preserve the non-sensitive command output in `DEVELOPMENT.md`. This closes the evidence waiver
without reopening Stage 1.

## Production backup inventory

Before ingestion, an operator must record without committing credentials:

- Render database plan and region
- Automatic-backup and point-in-time-recovery availability
- Retention period and oldest recoverable timestamp
- Backup encryption and access roles
- Restore target isolation and expected recovery time
- Escalation owner and last successful drill date

A plan or dashboard claim is not restore evidence.

## Restore drill

1. Select a recent production backup without changing production.
2. Restore it into a new isolated database whose name contains `_test`.
3. Restrict network and credential access to the drill operators.
4. Record the backup timestamp, restore start/end times, and non-sensitive provider event IDs.
5. Run `alembic current`, `alembic upgrade head`, API repository checks, source/provenance counts,
   foreign-key checks, and checksum sampling.
6. Confirm existing geography, government-body, and source UUIDs match the source environment.
7. Destroy the disposable restore only after evidence is retained and no investigation needs it.
8. Append results, limitations, recovery time, and next drill date to `DEVELOPMENT.md`.

Do not use `alembic downgrade` as a production recovery strategy. Restore a copy and fix forward.

## Stage 2A/2B deployment window and recovery criteria

The Render contract runs `cd apps/api && alembic upgrade head` as the API pre-deploy command. Schedule
a maintenance window only after the production backup inventory and isolated provider restore drill
are recorded. Before the window, record revision `20260810_0001`, Stage 1 counts and UUID digests,
database size, active/max connections, backup timestamp, and the named operator.

If the migration transaction fails before commit, preserve its error output, correct the migration
on a disposable copy, and retry in a new window. If revision `20260814_0002` commits and a
compatibility or service defect appears, retain the additive schema and fix forward; do not run the
destructive downgrade in production. Restore the verified backup into an isolated target when data
corruption or an unresolvable committed migration makes fix-forward unsafe. Switching production to
a restored database requires an explicit operator decision and fresh readiness/API verification.

After pre-deploy succeeds, verify readiness, revision, Stage 1 counts/searches, 28 compatibility rows
per backfilled table, zero fabricated snapshots, 28 legacy raw-unavailable labels, public-view field
exclusions, database size, and active/max connections. Record non-sensitive Render deployment and
backup event identifiers in `DEVELOPMENT.md`.

## Minimum monitoring

Record alerts and a budget owner before raw ingestion:

- Database size and month-over-month growth
- Active, idle, and maximum database connections
- Migration failures and readiness failures
- Object count and bytes by storage class
- Upload, retrieval, and egress volume
- Snapshot and extraction failure rates
- Oldest unreviewed candidate age
- Backup age and last successful restore drill

Useful read-only PostgreSQL checks include `pg_database_size(current_database())` and
`pg_stat_activity` counts. Provider monitoring remains the source of truth for plan limits,
backup health, and object-storage billing.

## Snapshot object storage

Operators store every raw snapshot behind a small store abstraction
(`app/storage.py`) so the immutable bytes survive a database restore and the
`SourceSnapshot.object_storage_key` always holds the same relative key
(`snapshots/<sha256>.<html|pdf|json>`). The backend is selected per operator run
by `SNAPSHOT_STORAGE_BACKEND`:

- `local` (default): filesystem root given by the operator's `--storage-dir`
  (default `storage`). Used by tests, disposable runs, and local operators.
- `s3`: private S3-compatible bucket required by `S3_BUCKET`, with
  `S3_ENDPOINT_URL` (e.g. MinIO/Cloudflare R2) and `S3_REGION` (default
  `us-east-1`) overrides; credentials come from the standard AWS environment
  (`AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY`). The SDK is loaded lazily from
  the optional dependency group (`pip install -e '.[s3]'`), so the base install
  has no AWS dependency.

`python -m app.commands.storage_info [--storage-dir storage]` prints the
backend, a probe round-trip result, and the object count and total bytes in the
store (without echoing credentials). It feeds the monitoring gate's "object
count and bytes by storage class" line and is the pre-ingestion reachability
check for a configured bucket.

Code-side status: the abstraction, the local backend, the S3 backend, the
`storage_info` operator, and the operator refactor are complete and tested
(unit tests in `tests/test_storage.py`; every operator integration test writes
through the abstraction). Remaining external gates are unchanged: a private
bucket must be created and its cost limits approved, and credentials must be
provisioned to the operator environment only.

## Release gate

Stage 2 network ingestion must not begin until the disposable database check passes, a restore drill
passes, private object storage and its cost limits are approved, and the LGD access review is
recorded. Schema development and local contract tests may proceed before these external gates.

The `python -m app.commands.ingest_districts` command is the first network-ingestion surface. It is
an explicit, manual operator action (never a request path) and writes raw snapshots through the
`app/storage.py` abstraction: the local filesystem backend by default, or a private S3-compatible
bucket when `SNAPSHOT_STORAGE_BACKEND=s3` and `S3_BUCKET` are configured. Production use remains
gated on the criteria above and on private object storage being configured for
`SourceSnapshot.object_storage_key`.

## Controlled Stage 2A/2B deployment worksheet

Before migration, record the exact database name/ID, instance and workspace plan/region, backup or
PITR capability and retention, logical size, active/max connections, migration operator, deployment
window/timezone, expected duration, rollback authority, fix-forward criteria, and failure channel.
The Blueprint declares `ap-civic-db` on `free`, but the authenticated Render dashboard is authoritative;
Render documents that Free Postgres has no provider backup/PITR. Confirm the Recovery page and prove an
isolated restore; a backup control or plan declaration is not restore evidence.

If provider restore is unavailable, record that limitation, take a fresh `pg_dump` immediately before
migration, restore into separate PostgreSQL/PostGIS, and compare Stage 1 counts and exact UUID arrays.
Do not migrate until the named rollback authority accepts this operational risk.

Before and after deployment retain read-only output for database/PostgreSQL/PostGIS versions, size,
connections, Alembic revision, 26 seeded districts plus the two ingested via the district feed (28 in
total), three departments, 30 district source references, and exact UUID arrays. Afterward require
revision `20260814_0002`, unchanged Stage 1 UUIDs/counts, 28 compatibility chains, 28
`unavailable_legacy_source_reference` labels, district-feed snapshots/extraction runs matching the
recorded run, no private columns in `published_source_observations`, and HTTP evidence for health,
both language searches, `Vizag`, frontend routes, and public absence of storage keys/reviewer
identities. If the district feed has not been run, the four zero-count checks for
snapshots/extraction runs/corrections/review candidates still apply.

## Stage 7 data acceptance runbook

Revision `20260816_0003` adds the three supporting indexes
(`ix_review_decisions_observation_id`, `ix_observation_corrections_incorrect_observation_id`,
`ix_source_observations_published`) that the public read path needs: the correlated latest-decision
subquery, the correction exclusion, and every repository join on `review_decisions` previously
scanned the whole table per observation and degraded quadratically. On the disposable database the
`published_source_observations` count went from timing out (> 150 s) to ~1 s at 62,486 rows. Record
this revision in every acceptance note.

Two 2026-08-16 fixes make the seeded production path safe and the budget operator usable:

- `seed` previously published its 28 `source_reference` observations directly as `reviewed`/published,
  which the Stage 2 guard trigger forbids on a head-migrated database (the integration suite only
  passed because it seeded between migrations). It now inserts pending and unpublished, records an
  `approve` review decision, and transitions through the guarded review path, matching the migration
  backfill. `python -m app.commands.seed` on a head database is idempotent: expect 28 sources, 27
  geographies, 16 aliases, 29 relationships, 4 government bodies, 3 departments on first run and
  zeros on re-run, with exactly 28 published `source_reference` observations.
- `ingest_budget --years` now matches both `2025-26` and `2025-2026` forms of a fiscal year (the
  manifest lists full-form years such as `2014-2015`).

Ordered production data-acceptance sequence after the release gates pass, in one maintenance window:

1. Pre-flight: record database name/ID, instance plan/region, revision (head must include
   `20260816_0003`), PITR/backup capability, current logical size, active/max connections, and a
   fresh `pg_dump`; name the operator and rollback authority. Render's pre-deploy runs
   `cd apps/api && alembic upgrade head`.
2. Run `python -m app.commands.seed --reviewer <operator>` (the command reads `DATABASE_URL`). Verify
   the 28-source/27-geography first-run counts, the zero re-run, and 28 published observations.
3. Run the operators in dependency order, storing raw snapshots under a versioned storage directory:
   `ingest_districts`, `ingest_schemes`, `ingest_officeholders --term 16` then `--term 15` then
   `--term 14`, `ingest_elections --pdf term14.pdf --pdf term15.pdf --pdf term16.pdf`, then
   `ingest_budget` (all manifest years). Record every JSON summary.
4. Verify every catalogue endpoint returns `status: "reviewed"` with real records: states 1;
   districts under Andhra Pradesh 28; schemes 20; budget 3,175 lines across 13 fiscal years
   (2014-2015 through 2026-2027); officeholders 533 across terms 14/15/16; election results 531
   across terms 14/15/16. Expect 50 sources, 50 documents, 22 snapshots, 22 extraction runs, zero
   corrections, and every observation carrying an `approve` review decision.
5. Verify idempotency: re-running each operator stores zero new snapshots and creates zero new
   observations.
6. Public checks: `published_source_observations` excludes private columns (object storage keys,
   reviewer identities) and its count equals the reviewed published total; feed-status endpoint
   responds; health and both-language searches return HTTP 200.

The disposable run (2026-08-16, database `ap_civic_stage7_test`) stored term16/term15/term14
election results with 2,275/2,301/2,327 published observations, the three officeholder terms with
2,625/2,655/2,715, districts with 168, schemes with 100, and budget with 36,740 observations created
by the final full run (an interrupted earlier run had already stored 2014-2015 and 2015-2016, and the
single-year 2025-2026 probe stored 3,736), totalling 62,486 published observations. The
`Representative`/`public_offices` directory is not yet populated by any operator; the `/government`
page shows that honestly as prepared-empty, so `list_representatives()` returning 0 is expected
until that adapter exists.
