"""Fetch, store, review, and publish the official AP Legislative Assembly member report.

Run from the repository root:

    python -m app.commands.ingest_officeholders --term 16 --reviewer "operator-name"

Term choices are 16 (current), 15, or 14. The report HTML is stored as an
immutable snapshot before any observation is extracted. The reviewer identity
is recorded in every approval audit record.
"""

import argparse
import json
from datetime import UTC, datetime
from pathlib import Path

from app.db import get_session_factory
from app.ingestion.officeholders import (
    DEFAULT_TERM_ID,
    OfficeholderFeedError,
    fetch_ap_officeholders,
    parse_officeholders,
    review_officeholders_observations,
    store_officeholders_feed,
)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Ingest the official AP Legislative Assembly member report"
    )
    parser.add_argument(
        "--reviewer",
        required=True,
        help="identity of the operator performing the review",
    )
    parser.add_argument(
        "--term",
        type=int,
        default=DEFAULT_TERM_ID,
        help="Assembly term to ingest: 14, 15, or 16 (default: 16)",
    )
    parser.add_argument(
        "--storage-dir",
        default="storage",
        help="directory under which raw snapshots are stored (default: storage)",
    )
    args = parser.parse_args()

    if not args.reviewer.strip():
        raise OfficeholderFeedError("--reviewer must name the operator performing the review")

    snapshot = fetch_ap_officeholders(term_id=args.term)
    records = parse_officeholders(snapshot.raw, term_id=args.term)
    now = datetime.now(UTC)

    with get_session_factory()() as session, session.begin():
        stored = store_officeholders_feed(
            session,
            Path(args.storage_dir),
            snapshot,
            records,
        )
        reviewed_observations = review_officeholders_observations(
            session,
            extraction_run_id=stored.extraction_run_id,
            reviewer_identity=args.reviewer,
            decided_at=now,
        )

    print(
        json.dumps(
            {
                "term_id": args.term,
                "members_seen": len(records),
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
