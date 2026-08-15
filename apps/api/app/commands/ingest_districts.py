"""Fetch, store, review, and publish the official Andhra Pradesh district feeds.

Run from the repository root:

    python -m app.commands.ingest_districts --reviewer "operator-name"

The reviewer identity is recorded in every approval audit record.
"""

import argparse
import json
from datetime import UTC, datetime
from pathlib import Path

from app.db import get_session_factory
from app.ingestion.districts import (
    DistrictFeedError,
    attach_portal_codes,
    fetch_district_sources,
    parse_ap_portal_codes,
    parse_lgd_districts,
    publish_deferred_districts,
    review_feed_observations,
    store_district_feed,
)
from app.seeds.seed_stage1 import load_manifest


def main() -> None:
    parser = argparse.ArgumentParser(description="Ingest the official AP district feeds")
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

    lgd_snapshot, ap_snapshot = fetch_district_sources()
    portal_codes = parse_ap_portal_codes(ap_snapshot.raw)
    lgd_records = attach_portal_codes(parse_lgd_districts(lgd_snapshot.raw), portal_codes)
    now = datetime.now(UTC)

    with get_session_factory()() as session, session.begin():
        stored = store_district_feed(
            session,
            Path(args.storage_dir),
            lgd_snapshot,
            ap_snapshot,
            lgd_records,
            portal_codes,
        )
        reviewed_observations = review_feed_observations(
            session,
            extraction_run_ids=stored.extraction_run_ids,
            reviewer_identity=args.reviewer,
            decided_at=now,
        )
        published_districts = publish_deferred_districts(
            session,
            reviewer_identity=args.reviewer,
            decided_at=now,
            snapshot_sha256=stored.lgd_sha256,
            lgd_extraction_run_id=stored.lgd_extraction_run_id,
            valid_from=load_manifest().baseline_effective_date,
        )

    print(
        json.dumps(
            {
                "lgd_districts_seen": len(lgd_records),
                "ap_portal_districts_seen": len(portal_codes),
                "snapshots_stored": stored.snapshots_stored,
                "observations_created": stored.observations_created,
                "observations_reviewed": reviewed_observations,
                "deferred_districts_published": published_districts,
                "lgd_snapshot_sha256": stored.lgd_sha256,
                "reviewer": args.reviewer,
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
