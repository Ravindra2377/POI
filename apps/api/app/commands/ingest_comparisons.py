"""Operator command to build calculated claims-vs-records comparisons.

Run from the repository root:

    python -m app.commands.ingest_comparisons --reviewer "operator-name"

The command pairs reviewed official budget observations (the budget estimate
claim) with the recorded accounts (actuals) column of the same Annual Financial
Statement row and classifies the divergence. Every comparison is a platform
calculation (ValueClassification CALCULATED) whose verdict is deterministic,
and every side references its reviewed SourceObservation. The reviewer identity
is recorded on every published comparison row.
"""

import argparse
import json
from decimal import Decimal

from app.db import get_session_factory
from app.ingestion.comparisons import build_budget_comparisons, now_utc


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Build calculated claims-vs-records comparisons from reviewed observations"
    )
    parser.add_argument(
        "--reviewer",
        required=True,
        help="identity of the operator performing the review",
    )
    parser.add_argument(
        "--tolerance",
        default="5.00",
        help="absolute divergence percentage tolerated before DIVERGENT (default: 5.00)",
    )
    args = parser.parse_args()

    if not args.reviewer.strip():
        raise ValueError("--reviewer must name the operator performing the review")
    try:
        tolerance = Decimal(args.tolerance)
    except ArithmeticError as exc:  # noqa: BLE001
        raise ValueError(f"--tolerance must be a decimal number: {args.tolerance}") from exc
    if tolerance <= 0:
        raise ValueError("--tolerance must be positive")

    with get_session_factory()() as session, session.begin():
        summary = build_budget_comparisons(
            session,
            reviewer_identity=args.reviewer.strip(),
            decided_at=now_utc(),
            tolerance_percent=tolerance,
        )

    print(
        json.dumps(
            {
                "status": "success",
                "comparisons_created": summary["created"],
                "comparisons_updated": summary["updated"],
                "rows_skipped": summary["skipped"],
                "reviewer": args.reviewer.strip(),
                "tolerance_percent": str(tolerance),
            },
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())