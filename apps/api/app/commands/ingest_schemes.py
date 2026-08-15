"""Fetch, store, review, and publish the official myScheme Andhra Pradesh feed.

Run from the repository root:

    python -m app.commands.ingest_schemes --reviewer "operator-name"

The reviewer identity is recorded in every approval audit record.
"""

import argparse
import json
from datetime import UTC, datetime
from pathlib import Path

from app.db import get_session_factory
from app.ingestion.schemes import (
    SchemeFeedError,
    fetch_ap_schemes,
    parse_ap_schemes,
    review_scheme_observations,
    store_scheme_feed,
)


def main() -> None:
    parser = argparse.ArgumentParser(description="Ingest the official myScheme AP scheme feed")
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

    snapshot = fetch_ap_schemes()
    records = parse_ap_schemes(snapshot.raw)
    now = datetime.now(UTC)

    with get_session_factory()() as session, session.begin():
        stored = store_scheme_feed(
            session,
            Path(args.storage_dir),
            snapshot,
            records,
        )
        reviewed_observations = review_scheme_observations(
            session,
            extraction_run_id=stored.extraction_run_id,
            reviewer_identity=args.reviewer,
            decided_at=now,
        )

    print(
        json.dumps(
            {
                "ap_state_schemes_seen": len(records),
                "snapshots_stored": stored.snapshots_stored,
                "observations_created": stored.observations_created,
                "observations_reviewed": reviewed_observations,
                "snapshot_sha256": stored.sha256,
                "reviewer": args.reviewer,
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()