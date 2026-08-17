"""State-by-State daily news & press release automated ingestion worker.

Executes periodic or on-demand daily polling of official government press release
feeds for one or all States and Union Territories (PIB regional bureaus), saving
raw snapshots and extracting typed observations according to Non-negotiable Rules
#1, #3, and #4. The worker iterates the per-state feed registry so each
jurisdiction only ingests its own registered official feeds.
"""

import logging
from pathlib import Path
from sqlalchemy.orm import Session

from app.ingestion.daily_news import (
    DailyNewsError,
    NewsIngestionResult,
    feed_meta_from_registry,
    fetch_news_feed,
    parse_news_feed,
    store_daily_news,
)
from app.ingestion.state_feeds import STATE_FEED_REGISTRY, get_state_feeds

logger = logging.getLogger("daily_news_ingestor")


def run_daily_news_ingestion(
    session: Session,
    storage_dir: Path,
    state_codes: list[str] | None = None,
) -> list[NewsIngestionResult]:
    """Run the ingestion cycle across all registered feeds, optionally per state."""
    target_states = sorted(state_codes or STATE_FEED_REGISTRY)
    results: list[NewsIngestionResult] = []

    for state_code in target_states:
        if state_code not in STATE_FEED_REGISTRY:
            logger.warning("Unknown state or UT code skipped: %s", state_code)
            continue
        for feed in get_state_feeds(state_code):
            meta = feed_meta_from_registry(feed)
            try:
                logger.info(
                    "Polling state feed %s (%s): %s",
                    state_code,
                    feed.name,
                    feed.url,
                )
                snapshot = fetch_news_feed(meta)
                records = parse_news_feed(snapshot)
                result = store_daily_news(session, storage_dir, snapshot, records)
                results.append(result)
                logger.info(
                    "Completed %s feed %s: %d observations created (sha256=%s)",
                    state_code,
                    feed.key,
                    result.observations_created,
                    result.sha256[:8],
                )
            except DailyNewsError as error:
                logger.warning(
                    "Daily news feed error for %s (%s): %s",
                    state_code,
                    feed.key,
                    error,
                )
            except Exception as error:
                logger.error(
                    "Unexpected error ingesting feed %s (%s): %s",
                    feed.key,
                    state_code,
                    error,
                )

    return results
