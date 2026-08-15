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

## Release gate

Stage 2 network ingestion must not begin until the disposable database check passes, a restore drill
passes, private object storage and its cost limits are approved, and the LGD access review is
recorded. Schema development and local contract tests may proceed before these external gates.

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
connections, Alembic revision, 26 districts, three departments, 28 source references, and exact UUID
arrays. Afterward require revision `20260814_0002`, unchanged Stage 1 UUIDs/counts, 28 compatibility
chains, 28 `unavailable_legacy_source_reference` labels, zero snapshots/extraction runs/corrections,
no private columns in `published_source_observations`, and HTTP evidence for health, both language
searches, `Vizag`, frontend routes, and public absence of storage keys/reviewer identities.
