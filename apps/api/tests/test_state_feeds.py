"""Unit tests for the State-by-State official feed ingestion registry."""

from datetime import UTC, datetime

from app.ingestion.all_states import ALL_INDIA_STATES_UTS
from app.ingestion.daily_news import NewsFeedSnapshot, feed_meta_from_registry
from app.ingestion.languages import LANGUAGES_BY_CODE
from app.ingestion.state_feeds import (
    STATE_FEED_REGISTRY,
    get_all_registered_feed_keys,
    get_state_feeds,
    validate_feed_registry,
)
from app.models.enums import ValueClassification


def test_feed_registry_covers_all_36_states_and_uts() -> None:
    assert len(STATE_FEED_REGISTRY) == 36
    state_codes = {state.iso_code for state in ALL_INDIA_STATES_UTS}
    assert set(STATE_FEED_REGISTRY) == state_codes


def test_every_state_has_a_registered_official_feed() -> None:
    for iso_code, entry in STATE_FEED_REGISTRY.items():
        feeds = entry.feeds
        assert len(feeds) >= 1, f"{iso_code} has no registered feed"
        for feed in feeds:
            assert feed.jurisdiction_code == iso_code
            assert feed.url.startswith("https://pib.gov.in/RssMain.aspx")
            assert feed.language_code in LANGUAGES_BY_CODE
            assert feed.key.startswith(iso_code.lower())


def test_ap_feed_registry_points_to_verified_pib_vijayawada_feed() -> None:
    ap_feeds = get_state_feeds("IN-AP")
    assert len(ap_feeds) == 1
    feed = ap_feeds[0]
    assert "Regid=45" in feed.url  # PIB Vijayawada office
    assert feed.jurisdiction_code == "IN-AP"
    assert feed.language_code == "en"


def test_registry_validation_reports_no_problems() -> None:
    assert validate_feed_registry() == []
    assert len(get_all_registered_feed_keys()) == 36


def test_feed_metadata_carries_state_and_language() -> None:
    feed = get_state_feeds("IN-TG")[0]
    meta = feed_meta_from_registry(feed)
    assert meta["jurisdiction_code"] == "IN-TG"
    assert meta["language_code"] == "en"
    assert meta["url"] == feed.url
    assert meta["default_classification"] == "official"


def test_snapshot_carries_per_state_jurisdiction_and_language() -> None:
    feed = get_state_feeds("IN-TN")[0]
    snapshot = NewsFeedSnapshot(
        key=feed.key,
        name=feed.name,
        publisher=feed.publisher,
        url=feed.url,
        content_type="application/xml",
        raw=b"<rss/>",
        retrieved_at=datetime.now(UTC),
        default_classification=ValueClassification.OFFICIAL,
        jurisdiction_code=feed.jurisdiction_code,
        language_code=feed.language_code,
    )
    assert snapshot.jurisdiction_code == "IN-TN"
    assert snapshot.language_code == "en"