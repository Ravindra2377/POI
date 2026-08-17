"""Operator CLI command to execute automated daily news & press release ingestion.

Usage:
  python -m app.commands.ingest_daily_news [--feed <feed_url>] [--storage-dir <dir>]
"""

import argparse
import json
import sys
from pathlib import Path

from app.db import get_session_factory
from app.ingestion.daily_news import (
    DEFAULT_NEWS_FEEDS,
    fetch_news_feed,
    parse_news_feed,
    store_daily_news,
)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Ingest daily official press releases and news bulletins."
    )
    parser.add_argument(
        "--storage-dir",
        type=Path,
        default=Path("storage"),
        help="Local snapshot storage directory (default: storage/)",
    )
    parser.add_argument(
        "--url",
        type=str,
        default="",
        help="Optional custom press feed URL to poll",
    )
    args = parser.parse_args()

    session_factory = get_session_factory()
    with session_factory() as session:
        feeds = DEFAULT_NEWS_FEEDS
        if args.url:
            feeds = [
                {
                    "key": "custom-news-feed",
                    "name": "Custom News Feed",
                    "publisher": "Custom Operator News Feed",
                    "url": args.url,
                    "official_domain": "ap.gov.in",
                }
            ]

        total_created = 0
        feed_results = []
        for feed_meta in feeds:
            try:
                snapshot = fetch_news_feed(feed_meta)
                records = parse_news_feed(snapshot)
                result = store_daily_news(session, args.storage_dir, snapshot, records)
                session.commit()
                total_created += result.observations_created
                feed_results.append(
                    {
                        "feed": feed_meta["key"],
                        "sha256": result.sha256,
                        "stored": result.snapshots_stored,
                        "created": result.observations_created,
                    }
                )
            except Exception as error:
                sys.stderr.write(f"Feed error for {feed_meta['key']}: {error}\n")

        print(
            json.dumps(
                {
                    "status": "success",
                    "total_observations_created": total_created,
                    "feeds": feed_results,
                },
                indent=2,
            )
        )
    return 0


if __name__ == "__main__":
    sys.exit(main())
