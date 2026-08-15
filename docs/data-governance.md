# Data Governance

## Classification

- **Public official data:** government publications and observations with source rights recorded
- **Platform-derived data:** transparent calculations and inferences linked to inputs and method
- **Public community data:** reviewed reports, poll aggregates, and contributions approved for display
- **Restricted community data:** evidence, abuse signals, consent, account and contact information
- **Operational data:** logs, moderation history, extraction confidence, and quality metrics

## Provenance minimum

An official observation requires publisher, canonical source URL, source document or snapshot,
publication period or date when known, retrieval time, extraction method, review status, and a
checksum for stored raw content. Page, table, or cell references are required when the format permits.

## History and corrections

- Raw snapshots are immutable.
- New official values append observations with their own effective and retrieval dates.
- A correction identifies the incorrect record, reason, reviewer, and replacement relationship.
- Deletion is limited to legally required personal-data handling; tombstones and audit events remain
  where lawful and must not reveal deleted personal content.

## Calculation policy

Calculated fields declare their input observations, formula version, currency, unit, financial year,
and rounding policy. Inferences additionally declare confidence and review status. Neither is labeled
official.

## Data quality

Track freshness, completeness, extraction confidence, human review, conflicts, and quarantine state
independently. A single opaque quality score is prohibited. Malformed records enter quarantine; a
pipeline must not silently drop source fields.

## Personal data

Collect the minimum required for participation. Keep user-selected geography coarse. Evidence is
private by default, access-controlled, malware-scanned in production, and stripped of unnecessary
metadata before publication. Public APIs never expose contact details, precise user location, device
fingerprints, or internal abuse signals.

Consent, deletion, retention, breach response, grievance handling, and child-safety procedures need
Indian legal review before identity or community features launch. This document is an engineering
policy, not legal advice.

## Bilingual data

Store original source text and language, plus separate English and Telugu summaries. Machine-assisted
translations are labeled. Eligibility, legal, financial, and application instructions require human
review before being presented without a translation warning.

## Access and retention

Role-based access follows least privilege. Restricted evidence and account data receive defined
retention schedules before Stage 6. Audit logs are append-only and access to them is itself audited.

## Stage 1 source references and boundaries

Stage 1 introduced a minimal immutable source reference for every seeded record. Stage 2A/2B now
adds the richer document, snapshot-metadata, extraction, observation, decision, and correction schema
while retaining that compatibility bridge. Seed execution remains separate from schema migration
and refuses conflicting pre-existing values rather than silently replacing
them.

No boundary geometry is seeded in Stage 1. Null geometry means “not reviewed or unavailable,” not
zero area. Future boundary imports must preserve source, precision, and boundary validity, and must
append changed boundary observations instead of overwriting history.

## Stage 2 implementation boundary

New observations require exactly one typed value and an explicit classification. Non-legacy
observations require a stored immutable snapshot and versioned extraction run. Publication is
limited to reviewed observations. Snapshot, review-decision, and correction rows are
database-enforced append-only. Observation values and deletion are immutable; review/publication
state transitions require the latest immutable review decision. Corrections append an approved
replacement and are excluded from public projection without changing the original value.

Stage 1 raw bytes were not retained, so the compatibility backfill marks those documents as legacy
raw-unavailable and does not fabricate checksums. The minimal bridge remains until a later verified
migration. See [the Stage 2 provenance contract](provenance-contract.md).
