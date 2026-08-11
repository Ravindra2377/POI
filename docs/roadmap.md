# Implementation Roadmap

Each stage is a bounded task. A stage is complete only after changed files, migrations, tests,
commands, results, visual checks, security/privacy implications, limitations, and documentation are
reported.

| Stage | Outcome                                  | Completion evidence                                                 |
| ----- | ---------------------------------------- | ------------------------------------------------------------------- |
| 0     | Product contract and runnable foundation | Health checks and all baseline quality commands pass                |
| 1     | Geography and government entities        | Implemented; live PostGIS deployment proof remains required         |
| 2     | Append-only provenance                   | Raw metadata, observations, corrections, admin chain, history tests |
| 3     | Schemes and services                     | Explicit eligibility rules and source-cited bilingual pages         |
| 4     | Projects and procurement                 | Separate financial observations, status history, map, validations   |
| 5     | Search and My Area                       | Telugu/English aliases, coarse-area selection, query metrics        |
| 6     | Identity and privacy                     | Permission matrix, consent, deletion/export, threat review          |
| 7     | Transparent polls                        | Duplicate prevention, methodology, abuse signals, immutable close   |
| 8     | Structured citizen reports               | Private evidence, moderation workflow, confirmations, resolution    |
| 9     | Contextual discussions                   | Typed comments, evidence links, limited threads, correction labels  |
| 10    | Moderation console                       | Dual control, appeals, conflicts, immutable action history          |
| 11    | Source adapters                          | One reviewed, idempotent, fixture-tested adapter per bounded task   |
| 12    | Controlled beta                          | Readiness report with no unresolved blocking risk                   |

## Delivery principles

- Begin with manually reviewed, high-value records; do not scrape all AP sources at once.
- Make provenance and observation history precede domain records.
- Add identity only before features that require personal data.
- Treat Telugu review and moderation operations as launch requirements, not polish.
- Expand geography based on freshness, accuracy, participation quality, official response, moderation
  load, and sustainable verification cost—not download counts.

## Next task

Stage 1 should introduce Alembic and the PostgreSQL/PostGIS geographic and government-entity schema.
It must define stable identifiers, bilingual names, aliases, validity ranges, administrative nesting,
electoral overlap, source provenance, and fixtures for three pilot districts. Projects, polls, and
community reports remain excluded.

## Stage 1 delivery note

The schema, source-ready seed, read-only APIs, health probes, and Government Explorer are
implemented. Local unit, contract, API, frontend, accessibility-basics, strict typing, lint, and
production-build gates are required before handoff. The disposable PostgreSQL/PostGIS integration
test is opt-in through `TEST_DATABASE_URL`; Stage 1 is not operationally accepted on a deployment
until that empty-database migration, rerun, readiness, and seed-idempotency test passes.

The next bounded task is Stage 2: replace the minimal source-reference bridge with immutable raw
document metadata, snapshots, extraction runs, observations, corrections, and review decisions
while retaining every Stage 1 source link and UUID.
