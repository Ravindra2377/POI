# Stage 2 Provenance Contract

## Scope

Stage 2 establishes provenance before schemes, projects, finance, officeholder publication, or
community features expand. The first pipeline will use one reviewed Local Government Directory
source already connected to Stage 1. Additional adapters remain out of scope until that pipeline
passes end-to-end acceptance.

## Lifecycle

```text
Source
  -> Source document
  -> Immutable raw snapshot
  -> Versioned extraction run
  -> Append-only source observation
  -> Immutable review decision
  -> Reviewed public projection
  -> Append-only correction and superseding observation
```

Workers may create snapshots, extraction runs, and candidate observations. They cannot mark an
observation reviewed or publish it. Failed or quarantined extraction runs cannot produce public
records.

## Relational contract

- `sources` registers the publisher, official domain, access method, jurisdiction, reuse status,
  active dates, and review state.
- `source_documents` gives a stable identity to a document or endpoint response series.
- `source_snapshots` stores only retrieval and object metadata. Raw bytes never enter PostgreSQL.
- `extraction_runs` records the adapter and software versions, configuration, result, count, and
  error summary for one snapshot.
- `source_observations` stores one typed value, classification, time scope, source chain, and
  review/publication state.
- `review_decisions` is the private append-only audit trail for observation or extraction review.
- `observation_corrections` links an incorrect observation to its reviewed replacement.

The allowed value classifications are `official`, `calculated`, `inferred`, and
`community_reported`. Publication requires both `is_published = true` and
`review_state = reviewed`. The public projection excludes reviewer identities, parser
configuration, object-storage keys, and raw retrieval metadata.

Database triggers reject updates and deletes for snapshots, review decisions, and corrections.
Observation deletion and value changes are rejected; only review/publication state may transition,
and only when it matches the latest immutable review decision. Every review action is therefore
auditable without making candidate values mutable.

New observations must begin pending and unpublished. Review decisions form a single append-only
chain per observation or extraction run: database uniqueness prevents concurrent roots or forks,
and each later decision must reference the current decision. The public projection independently
requires the latest decision to be an approval, even if stored publication flags are temporarily stale.

Corrections must reference the latest approval for a reviewed replacement of the same entity and
field. They append a relationship instead of rewriting history, and the public projection excludes
the incorrect observation once that correction exists.

## Stage 1 compatibility

The migration retains `source_references` and every existing geography and government UUID. Each
Stage 1 source UUID is reused by its Stage 2 source, document, legacy observation, and review-decision
records in their separate tables. Existing API schemas continue to read `source_references`.

UUID uniqueness and meaning are table-local. Matching compatibility UUIDs do not make a source,
document, observation, and decision the same domain entity, and adapters must never infer semantic
identity from cross-table UUID equality. The reuse exists only to make the Stage 1 bridge deterministic
and auditable. New adapter-created sources, documents, observations, and decisions receive independent
identities unless a later compatibility contract explicitly and narrowly requires reuse.

Stage 1 did not retain raw response bytes. Backfill documents therefore carry
`raw_snapshot_status: unavailable_legacy_source_reference`, and legacy observations use the
explicit legacy-reference path. No checksum or snapshot is fabricated. Every new non-legacy
observation is constrained to reference both a real snapshot and an extraction run.

The old bridge may be deprecated only in a later migration after production backfill counts, public
API compatibility, and snapshot coverage have been independently verified.

## Raw-object storage policy

A private S3-compatible object store is required before the first network ingestion run. Provider
selection and production credentials are operational decisions and are intentionally absent from
the repository and `render.yaml`.

Initial controls:

- Stream downloads and uploads; never buffer an entire remote file by default.
- Limit a retrieved response to 50 MiB unless a source-specific review approves a lower or higher cap.
- Permit only reviewed MIME/format combinations such as PDF, CSV, XLSX, JSON, XML, HTML, and plain text.
- Compare response headers, filename extension, and detected file signature; trust none independently.
- Calculate lowercase SHA-256 while streaming and independently verify it after storage.
- Use generated keys shaped like
  `raw/{source_uuid}/{document_uuid}/{year}/{snapshot_uuid}`; never include a remote filename.
- Keep buckets private, block public ACLs, encrypt in transit and at rest, and use narrowly scoped
  service credentials.
- Treat HTML as data and never render it directly in a privileged or public origin.
- Quarantine archives and active content. Reject nested archives, encrypted archives, expansion over
  100 MiB, or decompression ratios over 20:1 until a stricter source-specific policy is reviewed.
- Retain accepted raw snapshots indefinitely for historical provenance. Legal removals require a
  tombstone and audit record without exposing restricted content.
- Detect duplicate content by SHA-256 and reference the earlier snapshot while retaining distinct
  retrieval events where the source lifecycle requires them.

The operator must record monthly storage, request, retrieval, and egress limits before provisioning.
No cost limit or provider is claimed as approved in the current repository.

## First adapter boundary

The first adapter will target one LGD endpoint already cited by Stage 1. Before implementation it
must record the exact URL, access conditions, robots guidance where applicable, timeout, retry and
rate limits, user agent, expected media type, fixture permission, field mapping, and change-detection
key.

The adapter must preserve the unchanged response before extraction, use bounded retries, produce
structured logs, quarantine parse failures, create candidate observations only, and remain
idempotent for unchanged content.
