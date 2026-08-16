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
- Network ingestion started with the district-feed command (see below). The public provenance UI
  started with the `/ingestion` status page, which surfaces snapshot, extraction, and review state
  for every registered feed; object-storage provisioning and the review UI have not begun.
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
(area alerts and submitted-evidence visibility, each marked planned; language choice stays with the
always-available header selector, which needs no account), a
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
published, and no moderation action has ever occurred. Network ingestion started with the
`ingest_districts` command: it stores the raw LGD and AP State Portal district responses as immutable
snapshots, extracts typed official observations, and publishes Markapuram and Polavaram with audited
review decisions, bringing the reviewed district directory to 28. The `/ingestion` page then exposes
`GET /api/v1/ingestion/feeds` so the public can see each feed's snapshot, extraction, and review
status without seeing reviewer identities or raw snapshot contents. Source links throughout the
public UI point at human-readable official pages (district portals, LGD portal, AP State Portal) and
show the exact recorded API endpoint as non-clickable evidence text, so machine endpoints are never
presented as browseable links. Additional states using the proven Andhra Pradesh pipeline remain out
of scope until production network-ingestion gates (private object storage, restore drill, LGD access
review) and data acceptance are operational.

Network ingestion then extended to Andhra Pradesh government schemes: the `ingest_schemes` command
fetches the official myScheme search (Govt. of India / MeitY), stores the raw response as an
immutable snapshot, extracts typed official observations, and publishes 20 Andhra Pradesh
state-level schemes (YSR Rythu Bharosa, Jagananna Amma Vodi, Dr. YSR Aarogyasri, Pedalandariki Illu,
and others) with audited review decisions. Because myScheme provides no Telugu, no AP nodal
department, no district-level coverage, and no public eligibility detail, those fields are honestly
left unpublished and the UI labels Telugu as "not yet reviewed" rather than fabricating values. The
`/schemes` directory and `/schemes/[slug]` detail pages now serve this reviewed catalogue through
`GET /api/v1/schemes` with an explicit prepared-empty fallback. Additional states, department
coverage, Telugu review, and eligibility detail remain out of scope until the same production
network-ingestion gates and data acceptance are operational.

The Andhra Pradesh budget pipeline now has a production-grade layout parser for the official AP Finance
Annual Financial Statement (Volume-I-1): all 14 available years (2013-14 through 2026-27) parse with
zero merged, empty, or comma-artifact head names across every statement (A Revenue Receipts,
B Capital Receipts, C Public Account Receipts, D Revenue Expenditure, E Capital Expenditure,
F Public Debt, G Public Account Disbursements). Values are decoded to rupees using each statement's
declared unit, and corpus-canonical head-name reconciliation resolves the wrapped-name ambiguities that
a per-year parser cannot. The operator CLI (`python -m app.commands.ingest_budget --reviewer <name>`),
the review/publish store path, and the `GET /api/v1/budget` catalogue endpoint are implemented,
mirroring the proven schemes pattern; the web budget catalogue slice remains to be upgraded to consume
that endpoint. Elections ingestion from the official AP Legislature term PDFs (14th/15th/16th terms)
remains on the roadmap.

Network ingestion then extended to the Andhra Pradesh Legislative Assembly officeholders: the
`ingest_officeholders` operator fetches the official aplegislature.org member report (a Liferay
portlet; the term choice is a render parameter, so a plain GET selects the term and avoids the site's
rate-limiting of portlet form POSTs), stores the raw HTML as an immutable snapshot, extracts typed
official observations, and publishes reviewed claims for all three supported terms with audited review
decisions: Term XVI (constituted 06.06.2024) 175 members, Term XV (25.05.2019) 177 members, and Term
XIV (01.05.2014) 181 members, all verified against the live site on 2026-08-16. The report publishes
English only, so Telugu fields remain honestly unpublished; seats with by-election replacements (e.g.
ATMAKUR in Term XV) publish one entity per `mem_id`. The site's PDF export uses a layout-unstable
template and is not used as a source. `/officeholders` remains a prepared slice until the reviewed
records are deployed to production and Stage 7 data acceptance is operational.

Elections ingestion then extended the same member reports: the `ingest_elections` operator takes
operator-supplied official term PDFs (the committed `term14.pdf`/`term15.pdf`/`term16.pdf` are genuine
publications in the clean pre-2026 template — the live export now uses the pathological template and is
not fetched), converts each with `pdftotext -layout`, parses the wrapped and annotated rows, stores the
PDF as an immutable snapshot, and publishes reviewed official observations with audited review decisions.
Verified parses: Term XVI 175 results, Term XV 177 (2 by-elections: Atmakur, Badvel), Term XIV 179 (4
by-elections: Nandigama, Allagadda, Madakasira, Tirupathi). By-election rows inherit their seat from the
original row; deaths, resignations, and disqualifications are recorded as seat status on the original
result. The reports are English-only, so Telugu fields remain honestly unpublished; one Term XVI row
(Kovur) omits its constituency number in the source and is published with an empty constituency number;
the 14th-term report's NOMINATED placeholder rows carry no member name and are not transcribed. The
`/api/v1/election-results` catalogue endpoint now serves the published `election_result` observations as
official claims grouped by result, mirroring the officeholders pattern; the web `/election-results`
slice is live with a bilingual directory, district/party/term/seat-status filters, per-record
detail pages, and the same prepared-empty honesty labels until reviewed records are deployed to
production and Stage 7 data acceptance is operational.
