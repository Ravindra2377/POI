# AP Civic Platform Engineering Instructions

## Product

This repository contains a civic intelligence and participation platform for Andhra Pradesh.
The system must keep official government information, platform-derived information, and
community-generated information visibly and technically separate.

## Non-negotiable rules

1. Every official claim must reference a `SourceRecord`.
2. Never silently overwrite historical government data.
3. Store raw source documents before extracting normalized records.
4. Mark every value as official, calculated, inferred, or community-reported.
5. Never describe platform polls as representative of Andhra Pradesh.
6. Do not expose precise user locations.
7. Telugu and English must be supported in user-facing data structures.
8. All moderation actions must produce an audit record.
9. Add migrations, tests, and documentation for schema changes.
10. Do not use mock information in production paths without a visible label.
11. Keep `DEVELOPMENT.md` as the single cumulative development record. Append every completed stage
    or material implementation to it; do not create separate stage-completion reports.

## Engineering workflow

Before implementation:

- Inspect relevant files.
- State assumptions.
- Identify affected schemas and security boundaries.
- Describe the verification plan.

After implementation:

- Run formatting, linting, type checks, and tests.
- Review the complete diff.
- Report unresolved risks and data limitations.
- Update relevant documentation.
- Append the completed work and verification evidence to `DEVELOPMENT.md`.

Do not implement unrelated features.

## Repository commands

- `npm run format:check` checks repository formatting.
- `npm run lint`, `npm run typecheck`, and `npm test` verify the web application.
- `npm run build` builds the web application.
- From `apps/api`, run `ruff check --no-cache .`, `mypy --no-incremental app tests`, and `pytest -p no:cacheprovider` for API checks.
- `render.yaml` is the deployment contract. Do not add container deployment unless explicitly requested.
