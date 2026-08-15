# Product Requirements: India-wide Platform, Andhra Pradesh Launch

## Product promise

The durable product scope is India-wide. Andhra Pradesh is the first reviewed implementation and
rollout boundary, not a permanent geographic limit. New states may be added only after the Andhra
Pradesh provenance and ingestion pipeline is accepted.

Help a person understand what is happening in their area and compare official government records
with structured, clearly separated community experience.

The first reliable question is: for a scheme or project, how much was promised, allocated,
released, spent, and delivered—and which official source supports each figure?

## Users

- Citizens looking for local projects, schemes, and responsible public offices
- Journalists and researchers auditing public spending and implementation
- Civic organizations coordinating evidence-based participation
- Government officials correcting records or responding to reports
- Moderators and data reviewers maintaining safety and provenance

## Pilot scope

- Andhra Pradesh as the first implementation of the India-wide schema and public experience
- All 26 districts in the directory; controlled content rollout may start with selected districts
- District and mandal navigation without precise user GPS
- Roads and infrastructure, healthcare, and education
- 30–50 curated schemes and 100–200 manually reviewed projects before public beta
- English and Telugu user-facing fields
- Official sources, transparent polls, structured citizen reports, and a moderation console

## Required evidence separation

| Evidence class | Meaning                                                    | Example label                                  |
| -------------- | ---------------------------------------------------------- | ---------------------------------------------- |
| Official       | Published by an identified public authority                | Reported by the department                     |
| Calculated     | Deterministic platform calculation from cited observations | Calculated from official releases              |
| Inferred       | Platform interpretation with uncertainty                   | Inferred; review pending                       |
| Community      | Participant-submitted experience or evidence               | Community-reported; not independently verified |

Community evidence must never mutate or masquerade as an official observation.

## Financial vocabulary

Announced amount, budget estimate, revised estimate, released funds, utilized funds, actual
expenditure, tender estimate, contract award, revised project cost, physical progress, and public
outcome are separate observation types. The interface must not combine them into one spending
number.

## Initial journeys

1. Select a district and mandal; see applicable schemes, projects, offices, updates, polls, and
   unresolved reports.
2. Open a scheme; inspect purpose, structured eligibility, application channel, performance, and
   every supporting source.
3. Open a project; inspect financial and status history, procurement, map coverage, official
   observations, and separately displayed local reports.
4. Submit a structured report with private-by-default evidence and follow its moderation and
   response history.
5. Participate in a scoped poll whose eligibility, sample, methodology, dates, and limitations
   are explicit.

## Explicitly excluded from the MVP

- General political posting, private messaging, follower graphs, and trending hashtags
- Election forecasts or exit polls
- Unrestricted anonymous allegations
- AI-generated news or opaque AI eligibility decisions
- Claims that platform poll participants represent Andhra Pradesh as a whole

## Stage 0 acceptance

- The repository has durable engineering and evidence-handling instructions.
- The Render Blueprint defines web, API, and managed PostgreSQL services with health checks.
- Web and API health endpoints respond.
- Formatting, linting, type checks, tests, and a production web build pass.
- Product, architecture, governance, source, moderation, threat, and roadmap documents exist.
