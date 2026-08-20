# Moderation Policy: Engineering Baseline

## Scope

This policy applies to citizen reports, discussions, polls, evidence, profile presentation, and
official responses. Community submissions use pseudonymous citizen profiles; authenticated staff controls govern publication and moderation.

## Content labels

Opinion, question, personal experience, evidence submitted, official response, disputed claim,
corrected information, and removed for policy violation are distinct states. An account's verified
identity does not verify the truth of a claim.

## Prohibited content

- Doxxing, personal addresses, phone numbers, and sensitive beneficiary information
- Threats, targeted harassment, caste or religious abuse
- Impersonation and manipulated evidence
- Unsubstantiated personal criminal allegations
- Coordinated spam or attempts to evade participation controls
- Content that creates a material safety or privacy risk

## Review principles

- Evidence is private until reviewed and intentionally published.
- Moderators cannot create, edit, or delete official source observations.
- Every action records actor, reason, time, policy basis, and affected object.
- High-impact actions—permanent account restriction, public evidence publication, or irreversible
  bulk action—require a second reviewer.
- Users receive correction, notice, and appeal paths appropriate to the action.
- Positive completion and improvement reports receive the same evidence rules as complaints.

## Poll integrity

Freeze suspicious responses for review rather than secretly rewriting published results. Store the
exact question, options, eligibility, geography, dates, sponsor, response count, verification mix,
weighting, duplicate controls, and limitations. Public copy says "Results among participating
platform users" unless a professionally reviewed representative survey design applies.

## Operations before beta

Define response-time targets, moderator permissions, escalation to legal and safety review, emergency
evidence takedown, law-enforcement request handling, transparency reporting, reviewer wellbeing, and
appeal service levels. Obtain Indian legal review for user-generated content and grievance duties.

## Implemented staff boundary

Citizen profiles remain pseudonymous and are never promoted into staff accounts. Administrators and
moderators use separate authenticated records with salted scrypt password hashes, eight-hour
revocable sessions, temporary lockout after repeated failed sign-ins, and roles enforced by the API.
An administrator can create moderators; new moderators must replace their temporary password before
viewing the queue or acting on content.

Administrators can also inspect up to the 200 most recent reports and comments across every status,
including published and hidden records, view internal staff-account status, and review recent audit
history. The all-status inventory and staff directory are API-authorized administrator surfaces;
moderators cannot request them. Content records expose pseudonyms and bilingual content fields but
never precise citizen locations or private staff identity to citizen-facing pages.

New reports and comments enter `pending_review`. Authenticated staff review the private queue at
`/admin`. Approve, flag, hide, and restore transitions update the target and append the audit record
in one database transaction. The public log displays the staff role rather than the staff email or
internal identity.

The first administrator is created only from a trusted API shell after migration:

```bash
cd apps/api
python -m app.commands.create_admin \
  --email admin@example.org \
  --display-name "Platform administrator"
```

The command prompts twice for a password and never accepts or prints it as a command-line argument.
Do not share a citizen pseudonym, administrator password, session token, or temporary moderator
password in tickets, logs, or `DEVELOPMENT.md`.

MFA, distributed rate limiting, evidence-upload quarantine, appeals, and moderator staffing/service
levels remain gates before unrestricted community participation.
