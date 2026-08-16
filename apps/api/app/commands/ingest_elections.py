"""Store, review, and publish official AP Legislative Assembly election results.

Run from the repository root:

    python -m app.commands.ingest_elections \
        --pdf apps/api/tests/fixtures/term14.pdf \
        --pdf apps/api/tests/fixtures/term15.pdf \
        --pdf apps/api/tests/fixtures/term16.pdf \
        --reviewer "operator-name"

Each official member-report PDF is stored as an immutable snapshot before any
observation is extracted. The report header identifies the term (14, 15, or
16), so the CLI does not need a --term argument. The reviewer identity is
recorded in every approval audit record.
"""

import argparse
import json
from datetime import UTC, datetime
from pathlib import Path

from app.db import get_session_factory
from app.ingestion.elections import (
    ElectionFeedError,
    _pdf_to_text,
    build_election_snapshot,
    parse_election_results,
    review_election_observations,
    store_election_results,
)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Ingest the official AP Legislative Assembly member reports (election results)"
    )
    parser.add_argument(
        "--pdf",
        required=True,
        action="append",
        help="path to an official member-report PDF (repeatable)",
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
        raise ElectionFeedError("--reviewer must name the operator performing the review")

    now = datetime.now(UTC)
    with get_session_factory()() as session, session.begin():
        for pdf_path in args.pdf:
            path = Path(pdf_path)
            if not path.is_file():
                raise ElectionFeedError(f"member report not found: {path}")
            raw = path.read_bytes()
            text = _pdf_to_text(raw)
            records = parse_election_results(text)
            snapshot = build_election_snapshot(
                raw,
                term_id=records[0].term_id,
                file_name=path.name,
            )
            stored = store_election_results(session, Path(args.storage_dir), snapshot, records)
            reviewed_observations = review_election_observations(
                session,
                extraction_run_id=stored.extraction_run_id,
                reviewer_identity=args.reviewer,
                decided_at=now,
            )
            print(
                json.dumps(
                    {
                        "term_id": records[0].term_id,
                        "constituency_results_seen": len(records),
                        "snapshots_stored": stored.snapshots_stored,
                        "observations_created": stored.observations_created,
                        "observations_reviewed": reviewed_observations,
                        "snapshot_sha256": stored.sha256,
                        "source_file": path.name,
                        "reviewer": args.reviewer,
                    },
                    indent=2,
                )
            )


if __name__ == "__main__":
    main()
