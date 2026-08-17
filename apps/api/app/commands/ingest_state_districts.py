"""Operator command to ingest the official LGD district feed for any State or UT.

Run from the repository root:

    python -m app.commands.ingest_state_districts --state IN-KA --reviewer "operator-name"
    python -m app.commands.ingest_state_districts --all --reviewer "operator-name"

Andhra Pradesh is covered by the dedicated pilot command
``app.commands.ingest_districts`` (portal codes and deferred districts), so the
national flow seeds and ingests the other 35 States and Union Territories.

Each run stores the raw LGD response as an immutable snapshot, extracts typed
official observations, reviews and publishes them, and publishes every recorded
district as a Geography under the seeded state, retaining the LGD local name as
a native-language alias. The reviewer identity is recorded in every approval
audit record.
"""

import argparse
import json
from datetime import UTC, datetime
from pathlib import Path

from app.db import get_session_factory
from app.ingestion.all_states import ALL_INDIA_STATES_UTS, StateRecord
from app.ingestion.districts import (
    DistrictFeedError,
    ingest_state_districts,
)
from app.seeds.seed_stage1 import load_manifest

AP_ISO = "IN-AP"


def _resolve_states(state_codes: list[str] | None) -> list[StateRecord]:
    states = {state.iso_code: state for state in ALL_INDIA_STATES_UTS}
    if state_codes:
        missing = [code for code in state_codes if code not in states]
        if missing:
            raise DistrictFeedError(f"unknown state ISO code(s): {', '.join(missing)}")
        for code in state_codes:
            if code == AP_ISO:
                raise DistrictFeedError(
                    "Andhra Pradesh is covered by app.commands.ingest_districts; "
                    "the national flow seeds and ingests the other 35 States and UTs."
                )
        return [states[code] for code in state_codes]
    return [state for state in ALL_INDIA_STATES_UTS if state.iso_code != AP_ISO]


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Ingest the official LGD district feed for a State or Union Territory"
    )
    parser.add_argument(
        "--state",
        action="append",
        metavar="ISO",
        help="ISO-3166-2 code(s), e.g. --state IN-KA (repeatable)",
    )
    parser.add_argument(
        "--all",
        action="store_true",
        help="ingest all 36 States and UTs except Andhra Pradesh",
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
        raise DistrictFeedError("--reviewer must name the operator performing the review")
    if args.state and args.all:
        raise DistrictFeedError("use either --state or --all, not both")

    states = _resolve_states(args.state)
    decided_at = datetime.now(UTC)
    valid_from = load_manifest().baseline_effective_date
    summaries: list[dict[str, object]] = []

    with get_session_factory()() as session, session.begin():
        for state in states:
            result = ingest_state_districts(
                session,
                Path(args.storage_dir),
                state=state,
                reviewer_identity=args.reviewer,
                decided_at=decided_at,
                valid_from=valid_from,
            )
            summary: dict[str, object] = {
                "state": result.state_iso,
                "districts_seen": result.districts_seen,
                "snapshots_stored": result.snapshots_stored,
                "observations_created": result.observations_created,
                "observations_reviewed": result.observations_reviewed,
                "geographies_published": result.geographies_published,
                "snapshot_sha256": result.snapshot_sha256,
            }
            summaries.append(summary)
            print(json.dumps(summary))

    print(
        json.dumps(
            {
                "status": "success",
                "states_ingested": len(summaries),
                "reviewer": args.reviewer,
                "valid_from": valid_from.isoformat(),
            },
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
