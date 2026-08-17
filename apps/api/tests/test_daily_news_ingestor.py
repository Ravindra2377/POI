"""Unit tests for the automated daily news ingestion adapter."""

from datetime import UTC, datetime

from app.ingestion.daily_news import (
    NewsFeedSnapshot,
    parse_news_feed,
)
from app.models.enums import ValueClassification


def test_parse_rss_news_feed() -> None:
    raw_rss = b"""<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
<channel>
    <title>AP IPPR Press Releases</title>
    <item>
        <title>Chief Minister Launches AP Digital Infrastructure Initiative</title>
        <description>AP Government launched digital infrastructure.</description>
        <link>https://ipr.ap.gov.in/news/101</link>
        <pubDate>Mon, 17 Aug 2026 10:00:00 GMT</pubDate>
        <guid>ap-ippr-101</guid>
    </item>
</channel>
</rss>"""

    snapshot = NewsFeedSnapshot(
        key="test-rss-feed",
        name="Test RSS Feed",
        publisher="AP IPPR",
        url="https://ipr.ap.gov.in/feed",
        content_type="application/xml",
        raw=raw_rss,
        retrieved_at=datetime.now(UTC),
        default_classification=ValueClassification.OFFICIAL,
    )

    records = parse_news_feed(snapshot)
    assert len(records) == 1
    assert (
        records[0].headline
        == "Chief Minister Launches AP Digital Infrastructure Initiative"
    )
    assert records[0].item_id == "ap-ippr-101"
    assert records[0].classification == ValueClassification.OFFICIAL


def test_parse_json_news_feed() -> None:
    raw_json = b"""{
        "items": [
            {
                "id": "news-201",
                "title": "New Water Supply Project Sanctioned in Guntur",
                "description": "State cabinet approves drinking water pipeline.",
                "url": "https://pib.gov.in/news/201",
                "published_date": "2026-08-17"
            }
        ]
    }"""

    snapshot = NewsFeedSnapshot(
        key="test-json-news",
        name="Test JSON News",
        publisher="PIB AP",
        url="https://pib.gov.in/rss",
        content_type="application/json",
        raw=raw_json,
        retrieved_at=datetime.now(UTC),
        default_classification=ValueClassification.OFFICIAL,
    )

    records = parse_news_feed(snapshot)
    assert len(records) == 1
    assert records[0].item_id == "news-201"
    assert (
        records[0].headline == "New Water Supply Project Sanctioned in Guntur"
    )
    assert records[0].publisher == "PIB AP"
