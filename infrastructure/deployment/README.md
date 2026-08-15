# Deployment

The root `render.yaml` defines the Stage 0 Render Blueprint. Before beta, document managed secrets,
database backups and restore drills, private evidence storage, monitoring, and rollback procedures.

Before Stage 2 ingestion, follow [the operations and recovery runbook](../../docs/operations-and-recovery.md).
It requires a disposable migration/double-seed check, production backup inventory, isolated restore
drill, size/connection monitoring, and approved private object-storage cost limits. None of those
external gates is implied by adding the provenance migration.
