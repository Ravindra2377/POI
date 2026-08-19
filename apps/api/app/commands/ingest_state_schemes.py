"""Operator command to ingest the official myScheme scheme feed for any State or UT.

Run from the repository root:

    python -m app.commands.ingest_state_schemes --state IN-TN --reviewer "operator-name"
    python -m app.commands.ingest_state_schemes --all --reviewer "operator-name"

Every State's state-level schemes are fetched from the national myScheme
(Govt. of India, MeitY) portal, each raw HTTP response page is stored as an
immutable snapshot, typed official observations are extracted (linked to the
seeded state geography and jurisdiction-coded document), reviewed and
published. Andhra Pradesh reuses its existing pilot source/document and is
idempotent. The reviewer identity is recorded in every approval audit record.
"""

import argparse
import json
from datetime import UTC, datetime
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_session_factory
from app.ingestion.all_states import ALL_INDIA_STATES_UTS, StateRecord
from app.ingestion.schemes import (
    SchemeFeedError,
    fetch_state_schemes,
    parse_scheme_payload,
    review_scheme_observations_for_runs,
    state_scheme_search_name,
    store_state_scheme_feed,
)
from app.models.enums import GeographyType
from app.models.geography import Geography

AP_ISO = "IN-AP"
AP_SCHEME_FEED_KEY = "myscheme-ap-schemes"


def _resolve_states(state_codes: list[str] | None) -> list[StateRecord]:
    states = {state.iso_code: state for state in ALL_INDIA_STATES_UTS}
    if state_codes:
        missing = [code for code in state_codes if code not in states]
        if missing:
            raise SchemeFeedError(f"unknown state ISO code(s): {', '.join(missing)}")
        return [states[code] for code in state_codes]
    return list(states.values())


def _state_geography(session: Session, state: StateRecord) -> Geography:
    geography = session.scalar(
        select(Geography).where(
            Geography.entity_type == GeographyType.STATE,
            Geography.official_code == str(state.lgd_code),
        )
    )
    if geography is None:
        raise SchemeFeedError(
            f"the state geography for {state.iso_code} (LGD {state.lgd_code}) "
            "has not been seeded; run app.commands.seed_all_states first"
        )
    return geography


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Ingest the official myScheme scheme feed for a State or Union Territory"
    )
    parser.add_argument(
        "--state",
        action="append",
        metavar="ISO",
        help="ISO-3166-2 code(s), e.g. --state IN-TN (repeatable)",
    )
    parser.add_argument(
        "--all",
        action="store_true",
        help="ingest state-level schemes for all 36 States and UTs",
    )
    parser.add_argument(
        "--reviewer",
        required=True,
        help="identity of the operator performing the review",
    )
    parser.add_argument(
        "--storage-dir",
        default="storage",
        help="directory under which raw snapshots are stored (default: storage)",
    )
    args = parser.parse_args()

    if not args.reviewer.strip():
        raise SchemeFeedError("--reviewer must name the operator performing the review")
    if args.state and args.all:
        raise SchemeFeedError("use either --state or --all, not both")

    states = _resolve_states(args.state)
    decided_at = datetime.now(UTC)
    summaries: list[dict[str, object]] = []
    failures: list[dict[str, object]] = []

    with get_session_factory()() as session:
        for state in states:
            try:
                with session.begin():
                    summary = _ingest_state(
                        session,
                        state,
                        decided_at=decided_at,
                        reviewer_identity=args.reviewer,
                        storage_dir=Path(args.storage_dir),
                    )
            except SchemeFeedError as error:
                failures.append({"state": state.iso_code, "error": str(error)})
                print(json.dumps({"state": state.iso_code, "error": str(error)}))
                continue
            summaries.append(summary)
            print(json.dumps(summary))

    print(
        json.dumps(
            {
                "status": "success" if not failures else "partial",
                "states_ingested": len(summaries),
                "states_failed": len(failures),
                "failures": failures,
                "reviewer": args.reviewer,
            },
            indent=2,
        )
    )
    return 0 if not failures else 1


def _ingest_state(
    session: Session,
    state: StateRecord,
    *,
    decided_at: datetime,
    reviewer_identity: str,
    storage_dir: Path,
) -> dict[str, object]:
    geography = _state_geography(session, state)
    key_prefix = (
        AP_SCHEME_FEED_KEY
        if state.iso_code == AP_ISO
        else f"myscheme-state-schemes:{state.iso_code}"
    )
    snapshots = fetch_state_schemes(
        state_scheme_search_name(state.iso_code, state.name_en),
        key_prefix=key_prefix,
    )
    seen: dict[str, object] = {}
    records = []
    for snapshot in snapshots:
        for record in parse_scheme_payload(snapshot.raw, allow_empty=True):
            if record.slug not in seen:
                seen[record.slug] = record
                records.append(record)
    if not records:
        return {
            "state": state.iso_code,
            "schemes_seen": 0,
            "pages_fetched": len(snapshots),
            "snapshots_stored": 0,
            "observations_created": 0,
            "observations_reviewed": 0,
            "snapshot_sha256": None,
            "note": "myScheme reports no state-level schemes for this jurisdiction",
        }
    stored = store_state_scheme_feed(
        session,
        storage_dir,
        key_prefix=key_prefix,
        jurisdiction_code=state.iso_code,
        snapshots=snapshots,
        records=records,
        geography_id=geography.id,
        entity_key_prefix=(
            "" if state.iso_code == AP_ISO else f"{state.iso_code}:"
        ),
    )
    reviewed = review_scheme_observations_for_runs(
        session,
        extraction_run_ids=stored.extraction_run_ids,
        reviewer_identity=reviewer_identity,
        decided_at=decided_at,
    )
    return {
        "state": state.iso_code,
        "schemes_seen": len(records),
        "pages_fetched": len(snapshots),
        "snapshots_stored": stored.snapshots_stored,
        "observations_created": stored.observations_created,
        "observations_reviewed": reviewed,
        "snapshot_sha256": stored.sha256,
    }


if __name__ == "__main__":
    raise SystemExit(main())