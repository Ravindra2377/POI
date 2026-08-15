# Implementation Roadmap

Each stage is a bounded task. A stage is complete only after changed files, migrations, tests,
commands, results, visual checks, security/privacy implications, limitations, and documentation are
reported.

| Stage | Outcome                                  | Completion evidence                                                 |
| ----- | ---------------------------------------- | ------------------------------------------------------------------- |
| 0     | Product contract and runnable foundation | Health checks and all baseline quality commands pass                |
| 1     | Geography and government entities        | Accepted with documented seed-rerun evidence waiver                 |
| 2     | Append-only provenance                   | In progress: schema/backfill local; operational gates remain        |
| 3     | AP schemes and eligibility               | Source-cited bilingual rules and explicit eligibility semantics     |
| 4     | AP projects and responsible offices      | Reviewed project history, geography, status, and ownership          |
| 5     | Public financial observations            | Budget, release, utilisation, and expenditure remain distinct       |
| 6     | Tenders and contracts                    | Procurement stages and contractor relationships retain provenance   |
| 7     | Ministers and officeholder history       | Reviewed, time-bounded roles and terms                              |
| 8     | Search, alerts, and My Area              | Bilingual search and coarse user-selected geography                 |
| 9     | Accounts and structured reports          | Consent, private evidence, privacy, and review controls             |
| 10    | Polls, comments, and moderation          | Non-representative labels and immutable moderation audit            |
| 11    | Additional states                        | Reuse the accepted Andhra Pradesh provenance and ingestion pipeline |
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

## Status update — 14 August 2026

- Stage 1 is accepted under the documented seed-rerun evidence waiver.
- Stage 2A/2B implementation and disposable PostgreSQL/PostGIS integration are complete locally.
- Production restore and deployment evidence remain required for Stage 2A/2B operational acceptance.
- Network ingestion, object-storage provisioning, review UI, and public provenance UI have not begun.
- A disposable PostGIS run, backup/restore drill, storage budget approval, and LGD access review
  remain release gates.

After Stage 2 acceptance, domain work proceeds in this order: AP schemes, AP projects, financial
observations, procurement, officeholder history, search/alerts/My Area, accounts and structured
reports, polls/comments/moderation, then additional states using the proven Andhra Pradesh pipeline.

The AP Schemes website shell is prepared at `/schemes`, with bilingual presentation, department,
district, category and published-criteria filters, per-claim provenance UI, and explicit empty and
unavailable states. This is not Stage 3 data acceptance: the production catalogue remains visibly
empty until reviewed scheme records and their `SourceRecord` links exist.

The AP Projects website shell is also prepared at `/projects`, with department, district, status and
project-type filters; responsible-office and timeline fields; per-claim provenance; and explicit
empty and unavailable states. This is not Stage 4 data acceptance: the production catalogue remains
empty until reviewed project records exist.

The AP Public Money website slice is prepared at `/public-money`, keeping the eleven financial stages
distinct (an announcement is never an expenditure). It offers stage, department, district and
amount-information filters, the financial-stage explainer, per-claim provenance, and explicit empty,
filtered-empty and unavailable states; the home quick link now points at the prepared directory. This
is not financial data acceptance: no figure, period or amount is published until reviewed records
exist.

The AP Procurement website slice is prepared at `/procurement`, keeping seven procurement stages
distinct (a tender estimate is never a contract value, and an award is never an outcome). It offers
stage, department, district and contractor-information filters, the procurement-stage explainer,
per-claim provenance for tenders, contractors, contract values and references, and explicit empty,
filtered-empty and unavailable states. This is not Stage 6 data acceptance: no tender, contract value
or contractor is published until reviewed records exist.

The AP Officeholder History website slice is prepared at `/officeholders`, keeping time-bounded roles
and terms distinct from personal claims. It offers office, government-body, district and term-date
filters, a terms-bounded explainer, per-claim provenance for holders, offices, bodies and term dates,
and explicit empty, filtered-empty and unavailable states. This is not Stage 7 data acceptance: no
officeholder, role or term is published until reviewed records exist.

The AP My Area website slice is prepared at `/my-area`, giving a coarse, source-first briefing from a
district the user selects by bilingual search (English, Telugu or alternate name). No precise
location, coordinates or device location is collected; the choice is kept only in the web address. It
shows honest pending panels for schemes, projects, public money, procurement and officeholders that
link to each prepared directory, and an alerts-deferred box explaining that alerts require reviewable
accounts and consent controls that are not built. This is not Stage 8 data acceptance: nothing is
demonstrated for any district until reviewed records exist.

The AP Accounts and structured reports website slice is prepared at `/account` as an honest shell. It
states plainly that no account exists: no email, password, phone, or precise location is collected or
stored, and there is no sign-up, sign-in, or saved preference. It previews the planned consent model
(area alerts, language preference, and submitted-evidence visibility, each marked planned), a
prepared view of the five structured reports that would aggregate published reviewed records, and the
review-controls boundary (identity, moderation, appeals, abuse, and audit controls must be built
before any account exists). This is not Stage 9 data acceptance: no consent choice can be made or
stored, no personal data is collected, and no structured report is published until reviewed records
exist.

The AP Polls, comments, and moderation website slice is prepared at `/community` as a closed,
bilingual shell. It states that community participation is not yet open and that the page collects
nothing, previews the two planned participation modes (structured evidence and comments, and
transparent polls), carries the non-representative disclaimer that no poll result here represents
India or Andhra Pradesh together with the disclosure commitments every poll must carry (method and
size disclosed, no identity-linked results, attached to records), and previews the seven readiness
gates that must exist before any submission is accepted (identity, consent, private evidence,
moderation, appeals, abuse, and the immutable audit record that every future moderation action must
produce).

The community charter is prepared at `/community/charter`. It is a commitment, not an open door: it
defines the four evidence classes (official, calculated, inferred, community-reported), states that
community experience is always labeled and never silently official, lists what is never allowed
(impersonation, anonymous abuse, required precise locations, unlabeled community items), and links
back to the readiness gates. The `/api/community` route serves the explicitly labelled
`prepared-closed` participation state and is intentionally empty.

This is not Stage 10 data acceptance: nothing can be submitted, no poll is open, no result is
published, and no moderation action has ever occurred. Additional states using the proven Andhra
Pradesh pipeline are the next website slice; they remain out of scope until network ingestion and
data acceptance are operational.
