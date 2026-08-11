# Threat Model

## Assets

Official-source integrity, provenance history, private evidence, account and consent data, poll
integrity, moderator audit records, service availability, and public trust.

## Trust boundaries

1. External government sites and retrieved files are untrusted inputs.
2. Browser clients are untrusted and may be automated or modified.
3. Public API traffic crosses rate-limit and authorization boundaries.
4. Evidence storage is private and separate from public derivatives.
5. Workers may propose observations but publication requires policy and review gates.
6. Moderator and administrator actions are privileged, logged, and subject to separation of duties.

## Principal threats and planned controls

| Threat                               | Initial controls                                                           | Later verification                     |
| ------------------------------------ | -------------------------------------------------------------------------- | -------------------------------------- |
| Source spoofing or changed documents | Allowlisted registry, TLS, canonical URL, checksums, immutable snapshots   | Retrieval and signature tests          |
| Parser poisoning or malicious files  | Size/type limits, sandboxed extraction, malware scan, quarantine           | Hostile fixture suite                  |
| Silent record replacement            | Append-only observations and correction relationships                      | Database constraints and history tests |
| UGC doxxing or harmful allegations   | Private evidence, structured reports, review, PII detection, policy labels | Moderator drills and red-team cases    |
| Broken object authorization          | Deny-by-default roles and public/private schemas                           | Permission-matrix tests                |
| Poll brigading and duplicate voting  | Unique constraints, verification strata, rate limits, anomaly signals      | Manipulation simulations               |
| Precise-location disclosure          | District/mandal selection only, metadata stripping                         | API and upload privacy tests           |
| Moderator abuse                      | Required reasons, immutable audit, dual control for high impact            | Audit review and privilege tests       |
| Dependency or CI compromise          | Lockfiles, minimal images, scanning, protected releases                    | CI supply-chain review                 |
| Service exhaustion                   | Request and upload limits, queues, caching, backpressure                   | Load and failure tests                 |

## Stage 0 review

No account, evidence upload, ingestion, or official record path exists yet. The health endpoints
disclose only service identity, status, and version. Development credentials are explicitly local and must never be deployed. Render environment values
must be managed outside the repository, and the production database must reject public network access.

## Required stage reviews

- Provenance: source authenticity, immutable storage, and parser isolation
- Schemes/projects: cross-source conflicts and unsafe interpretations
- Identity: privacy, consent, session security, export, and deletion
- Polls/reports: abuse, evidence privacy, manipulation, and moderation capacity
- Beta: accessibility, authorization, backup/restore, incident, and legal readiness
