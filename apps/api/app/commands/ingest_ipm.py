"""Operator command to ingest the MoSPI Infrastructure Performance Monitoring dashboard.

Run from the repository root:

    python -m app.commands.ingest_ipm --reviewer "operator-name"

The command fetches the MoSPI IPM public dashboard page (the latest displayed
freeze by default), stores the raw HTML as an immutable snapshot, extracts
typed official observations for every State and UT (approved cost, revised
cost, cumulative expenditure, and project count in INR crore), reviews and
publishes them, and builds the approved-cost-vs-revised-cost comparisons. The
reviewer identity is recorded in every approval audit record.
"""

import argparse
import json
from decimal import Decimal
from pathlib import Path

from app.db import get_session_factory
from app.ingestion.comparisons import build_ipm_comparisons, now_utc
from app.ingestion.ipm import (
    DEFAULT_MONTH_YEAR,
    IpmFeedError,
    fetch_ipm_dashboard,
    parse_ipm_dashboard,
    review_ipm_observations,
    store_ipm_dashboard,
)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Ingest the MoSPI Infrastructure Performance Monitoring dashboard"
    )
    parser.add_argument(
        "--reviewer",
        required=True,
        help="identity of the operator performing the review",
    )
    parser.add_argument(
        "--month-year",
        default=DEFAULT_MONTH_YEAR,
        help="dashboard freeze month in YYYY-MM form (default: latest verified freeze)",
    )
    parser.add_argument(
        "--storage-dir",
        default="storage",
        help="directory under which raw snapshots are stored (default: storage)",
    )
    parser.add_argument(
        "--tolerance",
        default="5.00",
        help="absolute divergence percentage tolerated before DIVERGENT (default: 5.00)",
    )
    args = parser.parse_args()

    if not args.reviewer.strip():
        raise IpmFeedError("--reviewer must name the operator performing the review")
    try:
        tolerance = Decimal(args.tolerance)
    except ArithmeticError as exc:  # noqa: BLE001
        raise IpmFeedError(f"--tolerance must be a decimal number: {args.tolerance}") from exc
    if tolerance <= 0:
        raise IpmFeedError("--tolerance must be positive")

    snapshot = fetch_ipm_dashboard(args.month_year)
    rows = parse_ipm_dashboard(snapshot.raw.decode("utf-8", errors="replace"))
    storage = Path(args.storage_dir)
    now = now_utc()

    with get_session_factory()() as session, session.begin():
        stored = store_ipm_dashboard(
            session,
            storage,
            snapshot,
            rows,
        )
        review_ipm_observations(
            session,
            extraction_run_id=stored.extraction_run_id,
            reviewer_identity=args.reviewer,
            decided_at=now,
        )
        comparisons = build_ipm_comparisons(
            session,
            reviewer_identity=args.reviewer,
            decided_at=now,
            tolerance_percent=tolerance,
        )

    print(
        json.dumps(
            {
                "status": "success",
                "month_year": args.month_year,
                "states_covered": stored.states_covered,
                "snapshot_sha256": stored.sha256,
                "observations_created": stored.observations_created,
                "comparisons_created": comparisons["created"],
                "comparisons_updated": comparisons["updated"],
                "rows_skipped": comparisons["skipped"],
                "reviewer": args.reviewer,
            },
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())