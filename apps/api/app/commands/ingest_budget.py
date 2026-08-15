"""Fetch, store, review, and publish the AP Finance Annual Financial Statements.

Run from the repository root:

    python -m app.commands.ingest_budget --reviewer "operator-name"

The reviewer identity is recorded in every approval audit record. Each budget
year's AFS PDF is stored as an immutable snapshot before any observation is
extracted. Head names are reconciled against the full corpus before storage so
wrapped/merged names never pollute the catalogue.
"""

import argparse
import json
import subprocess
import tempfile
from datetime import UTC, datetime
from pathlib import Path

from app.db import get_session_factory
from app.ingestion.budget import (
    BudgetFeedError,
    BudgetLine,
    canonical_head_names,
    fetch_afs_manifest,
    fetch_afs_pdf,
    parse_afs_layout,
    parse_afs_manifest,
    reconcile_head_names,
    review_budget_observations,
    store_budget_afs,
)


def _pdf_to_layout(pdf: bytes) -> str:
    """Convert AFS PDF bytes to ``pdftotext -layout`` text."""
    with tempfile.TemporaryDirectory() as directory:
        pdf_path = Path(directory) / "afs.pdf"
        text_path = Path(directory) / "afs.txt"
        pdf_path.write_bytes(pdf)
        try:
            subprocess.run(
                ["pdftotext", "-layout", str(pdf_path), str(text_path)],
                check=True,
                capture_output=True,
            )
        except (subprocess.CalledProcessError, FileNotFoundError) as error:
            raise BudgetFeedError(
                "pdftotext -layout failed for the AFS PDF; is poppler-utils installed?"
            ) from error
        return text_path.read_text(encoding="utf-8", errors="replace")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Ingest the official AP Annual Financial Statements"
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
    parser.add_argument(
        "--years",
        default=None,
        help="comma-separated fiscal years to ingest (default: all manifest years)",
    )
    args = parser.parse_args()

    if not args.reviewer.strip():
        raise BudgetFeedError("--reviewer must name the operator performing the review")

    manifest_html = fetch_afs_manifest()
    years = parse_afs_manifest(manifest_html)
    if args.years:
        selected = {year.strip() for year in args.years.split(",")}
        years = [year for year in years if year.fiscal_year in selected]
    if not years:
        raise BudgetFeedError("no Annual Financial Statement years discovered in the manifest")

    parsed_by_year: dict[str, list[BudgetLine]] = {}
    for year in years:
        snapshot = fetch_afs_pdf(year)
        layout = _pdf_to_layout(snapshot.raw)
        parsed_by_year[year.fiscal_year] = parse_afs_layout(
            layout, fiscal_year=year.fiscal_year
        )

    canonical = canonical_head_names(list(parsed_by_year.values()))
    now = datetime.now(UTC)
    storage = Path(args.storage_dir)
    years_summary: list[dict[str, object]] = []
    lines_seen = 0
    observations_created = 0
    with get_session_factory()() as session, session.begin():
        for year in years:
            lines = reconcile_head_names(parsed_by_year[year.fiscal_year], canonical)
            snapshot = fetch_afs_pdf(year)
            stored = store_budget_afs(
                session,
                storage,
                snapshot,
                lines,
            )
            review_budget_observations(
                session,
                extraction_run_id=stored.extraction_run_id,
                reviewer_identity=args.reviewer,
                decided_at=now,
            )
            lines_seen += len(lines)
            observations_created += stored.observations_created
            years_summary.append(
                {
                    "fiscal_year": year.fiscal_year,
                    "lines": len(lines),
                    "snapshot_sha256": stored.sha256,
                    "observations_created": stored.observations_created,
                }
            )

    print(
        json.dumps(
            {
                "years_seen": len(years),
                "lines_seen": lines_seen,
                "observations_created": observations_created,
                "reviewer": args.reviewer,
                "years": years_summary,
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()