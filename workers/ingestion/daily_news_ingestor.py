"""Daily news & press release automated ingestion worker.

Executes periodic or on-demand daily polling of official government press releases
(AP IP&PR, PIB India AP) and public feeds, saving raw snapshots and extracting typed
observations according to Non-negotiable Rules #1, #3, and #4.
"""

import logging
from pathlib import Path
from typing import Any
from sqlalchemy.orm import Session

from app.ingestion.daily_news import (
    DEFAULT_NEWS_FEEDS,
    DailyNewsError,
    NewsIngestionResult,
    fetch_news_feed,
    parse_news_feed,
    store_daily_news,
)

logger = logging.getLogger("daily_news_ingestor")


def run_daily_news_ingestion(
    session: Session,
    storage_dir: Path,
    feeds: list[dict[str, Any]] | None = None,
) -> list[NewsIngestionResult]:
    """Run daily ingestion cycle across all registered press release feeds."""
    target_feeds = feeds or DEFAULT_NEWS_FEEDS
    results: list[NewsIngestionResult] = []

    for feed_meta in target_feeds:
        try:
            logger.info("Polling daily news feed: %s (%s)", feed_meta["name"], feed_meta["url"])
            snapshot = fetch_news_feed(feed_meta)
            records = parse_news_feed(snapshot)
            result = store_daily_news(session, storage_dir, snapshot, records)
            results.append(result)
            logger.info(
                "Completed feed %s: %d observations created (sha256=%s)",
                feed_meta["key"],
                result.observations_created,
                result.sha256[:8],
            )
        except DailyNewsError as error:
            logger.warning("Daily news feed error for %s: %error", feed_meta["key"], error)
        except Exception as error:
            logger.error("Unexpected error ingesting daily news feed %s: %error", feed_meta["key"], error)

    return results
