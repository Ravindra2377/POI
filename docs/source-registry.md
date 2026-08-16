# Source Registry Specification

## Purpose

The source registry is the controlled inventory of public sources the platform is allowed and able
to retrieve. Registration precedes ingestion. Stage 1 defines the minimal source-reference bridge
and reviewed seed references. Stage 2 provenance schema development has begun, but production
ingestion remains gated and deferred.

## Required source fields

- Stable source UUID, public name, publisher, department or government body
- Canonical base URL and discovery URL
- Jurisdiction, geography, sector, and languages
- Access method: API, HTML, CSV, XLSX, PDF, dashboard, or manual acquisition
- Terms, license, robots guidance, authentication, and redistribution constraints
- Expected update frequency and known publication lag
- Maintainer, adapter owner, and operational status
- Last successful check, failure status, and escalation notes

## Required document and snapshot fields

- Canonical document URL and source relationship
- Title, publication date, reporting period, language, and media type
- Retrieval timestamp, HTTP metadata, file size, checksum, and storage key
- Original filename and format-detection result
- Page, table, sheet, or cell coordinates when applicable
- Extraction run, adapter version, confidence, review state, and quarantine reason

## Lifecycle

`candidate -> access-reviewed -> fixture-approved -> adapter-tested -> production -> paused -> retired`

A retired source remains addressable so historical observations retain provenance. Access changes,
terms changes, or systematic parsing failures pause new ingestion without deleting history.

## Adapter readiness gate

Each adapter documents access conditions, field mappings, idempotency key, checksum behavior, retry
limits, timeouts, pagination, malformed-record quarantine, observability, and a stored permitted
fixture. It requires source-level tests and one fixture-backed integration test.

## Initial research queue

Priorities for later, separate stages include Andhra Pradesh budget publications, department and
district portals, government orders, AP eProcurement, relevant Union Budget and PFMS records, CAG
reports, legislative records, and scheme-specific dashboards. Their access terms and current
interfaces must be reviewed individually before implementation.

## Stage 1 reviewed references

- Local Government Directory, Ministry of Panchayati Raj: official district list endpoint for
  state code 28 and LGD district codes; retrieved 2026-08-10.
- Andhra Pradesh State Portal district API and official Telugu district portals: supplementary
  bilingual-name and portal-code citations; retrieved 2026-08-10.
- Andhra Pradesh State Portal organisation API: initial Roads and Buildings, Health/Medical and
  Family Welfare, and School Education department records; retrieved 2026-08-10.

The requested seed baseline contains 26 districts. The live LGD response retrieved during review
listed 28, including Markapuram (LGD 790) and Polavaram (LGD 791). The two newer entries are not
silently merged into the requested baseline; the network-ingestion district feed records the live
response and publishes them only through an explicit, audited review action (see
`app/ingestion/districts.py` and the `ingest_districts` command). No boundary dataset has been
approved.

## Stage 2 first-adapter decision

The first end-to-end adapter is limited to one Local Government Directory endpoint already cited by
Stage 1. Its exact access conditions, rate limits, response contract, and permitted fixture must be
reviewed before network ingestion begins. No second source may be added until unchanged reruns,
changed snapshots, extraction failure, human review, and publication gates pass for the first.

Registered document metadata and normalized records remain in PostgreSQL. Raw responses must use
approved private S3-compatible object storage under the limits in
[the provenance contract](provenance-contract.md).

## Projects and procurement official-source assessment (2026-08-16)

Two placeholder ingestion modules claimed official status (`ReviewStatus.REVIEWED`,
`ValueClassification.OFFICIAL`, published) for hand-written records. The assessment below determined
that no verifiable official source supports those records, and both modules were removed as gating.

- **AP eProcurement** (`https://apeprocurement.gov.in`) is a real, official Andhra Pradesh portal
  (ITE&C Department, maintained by AP Technology Services; live bidding on
  `https://tender.apeprocurement.gov.in`). However, the removed adapter's claimed feed
  (`/tenders/published`) is not a verified interface, and its two sample tender records (SH-41
  Kakinada corridor, MRI equipment for Guntur GGH) were fabricated. The portal's access terms,
  search interface, and response contract have not been reviewed under the Stage 2 first-adapter
  gate, so no procurement adapter is registered.
- **AP infrastructure projects** — the removed adapter claimed
  `https://ap.gov.in/infrastructure-projects`, which returns 404 and is not a real page. Polavaram,
  Amaravati, and Visakhapatnam-Chennai Industrial Corridor are real undertakings, but the removed
  module's descriptions, statuses, and scope figures ("7.2 lakh acres", "Phase 1 Completed") were
  hand-written and unverified. No project catalogue page on any verified official AP domain has been
  identified, so no projects adapter is registered.

Both web slices (`/projects`, `/procurement`) remain prepared-empty by design and will stay empty
until a real adapter and a registered, access-reviewed source produce reviewed records. The API
catalog endpoints and web proxies serve `prepared-empty` with no data, which is the only possible
state until that adapter exists.
