"""Operator CLI command to execute state-by-state automated daily news ingestion.

Usage:
  python -m app.commands.ingest_daily_news [--state IN-AP] [--storage-dir <dir>]
"""

import argparse
import json
import sys
from pathlib import Path

from app.db import get_session_factory
from app.ingestion.daily_news import (
    DailyNewsError,
    feed_meta_from_registry,
    fetch_news_feed,
    parse_news_feed,
    store_daily_news,
)
from app.ingestion.state_feeds import STATE_FEED_REGISTRY, get_state_feeds


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Ingest official press releases for one or all States and Union Territories."
    )
    parser.add_argument(
        "--storage-dir",
        type=Path,
        default=Path("storage"),
        help="Local snapshot storage directory (default: storage/)",
    )
    parser.add_argument(
        "--state",
        type=str,
        default="",
        help="ISO-3166-2:IN code of a single state or UT to ingest (default: all 36)",
    )
    args = parser.parse_args()

    if args.state:
        if args.state not in STATE_FEED_REGISTRY:
            sys.stderr.write(
                f"Unknown state or UT code '{args.state}'. "
                f"Expected one of {sorted(STATE_FEED_REGISTRY)}.\n"
            )
            return 2
        state_codes = [args.state]
    else:
        state_codes = sorted(STATE_FEED_REGISTRY)

    session_factory = get_session_factory()
    with session_factory() as session:
        total_created = 0
        state_results = []
        feed_results = []
        for state_code in state_codes:
            feeds = [feed_meta_from_registry(feed) for feed in get_state_feeds(state_code)]
            for feed_meta in feeds:
                try:
                    snapshot = fetch_news_feed(feed_meta)
                    records = parse_news_feed(snapshot)
                    result = store_daily_news(
                        session, args.storage_dir, snapshot, records
                    )
                    session.commit()
                    total_created += result.observations_created
                    feed_results.append(
                        {
                            "state": state_code,
                            "feed": feed_meta["key"],
                            "sha256": result.sha256,
                            "stored": result.snapshots_stored,
                            "created": result.observations_created,
                        }
                    )
                except DailyNewsError as error:
                    sys.stderr.write(
                        f"Feed error for {feed_meta['key']} "
                        f"({state_code}): {error}\n"
                    )
                except Exception as error:
                    sys.stderr.write(
                        f"Unexpected error ingesting feed {feed_meta['key']} "
                        f"({state_code}): {error}\n"
                    )
            state_results.append(
                {"state": state_code, "registered_feeds": len(feeds)}
            )

        print(
            json.dumps(
                {
                    "status": "success",
                    "states_processed": len(state_codes),
                    "total_observations_created": total_created,
                    "states": state_results,
                    "feeds": feed_results,
                },
                indent=2,
            )
        )
    return 0


if __name__ == "__main__":
    sys.exit(main())
