"""Read-only automated daily news & official press release ingestion.

Fetches official government press bulletins (e.g. AP IP&PR, PIB India AP) and
verified news RSS/JSON feeds, stores raw snapshots in SnapshotStore, extracts typed
observations, and tags evidence as OFFICIAL, INFERRED, or COMMUNITY_REPORTED per
Non-negotiable Rules #1, #3, and #4.
"""

import json
import xml.etree.ElementTree as ET
from collections.abc import Sequence
from dataclasses import dataclass
from datetime import UTC, datetime
from hashlib import sha256
from pathlib import Path
from typing import Any
from urllib.parse import urlsplit
from urllib.request import Request, urlopen
from uuid import UUID, uuid5

from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.enums import (
    AccessMethod,
    ExtractionStatus,
    LanguageCode,
    ObservationReviewState,
    ReviewDecisionType,
    ReviewStatus,
    ValueClassification,
)
from app.models.provenance import (
    ExtractionRun,
    ReviewDecision,
    SourceDocument,
    SourceObservation,
    SourceRecord,
    SourceSnapshot,
)
from app.storage import get_snapshot_store, snapshot_key

DAILY_NEWS_NAMESPACE = UUID("a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d")
ADAPTER_VERSION = "1.0.0"
SOFTWARE_REVISION = "daily-news-ingestor-1.0.0"

DEFAULT_NEWS_FEEDS = [
    {
        "key": "ap-ippr-bulletins",
        "name": "AP Information & Public Relations Official Bulletins",
        "publisher": "Information & Public Relations Dept, Govt of AP",
        "url": "https://ipr.ap.gov.in/feed/press-releases",
        "official_domain": "ipr.ap.gov.in",
        "default_classification": ValueClassification.OFFICIAL,
    },
    {
        "key": "pib-ap-news",
        "name": "Press Information Bureau - Andhra Pradesh Bureau",
        "publisher": "Press Information Bureau, Govt of India",
        "url": "https://pib.gov.in/RssFeed.aspx?region=AP",
        "official_domain": "pib.gov.in",
        "default_classification": ValueClassification.OFFICIAL,
    },
]


class DailyNewsError(RuntimeError):
    """Raised when a daily news feed cannot be fetched or parsed."""


class DailyNewsRecord(BaseModel):
    """Normalized structured observation from a daily press item."""

    item_id: str
    headline: str
    summary: str
    article_url: str
    published_date: str
    publisher: str
    classification: ValueClassification = ValueClassification.OFFICIAL
    department: str = ""
    district: str = ""


@dataclass(frozen=True)
class NewsFeedSnapshot:
    """Metadata and raw content for a fetched daily news snapshot."""

    key: str
    name: str
    publisher: str
    url: str
    content_type: str
    raw: bytes
    retrieved_at: datetime
    default_classification: ValueClassification


@dataclass(frozen=True)
class NewsIngestionResult:
    """Result summary of a daily news ingestion run."""

    snapshots_stored: int
    observations_created: int
    extraction_run_id: UUID
    sha256: str


def _stable(key: str) -> UUID:
    return uuid5(DAILY_NEWS_NAMESPACE, key)


def fetch_news_feed(
    feed_meta: dict[str, Any], timeout: float = 15.0
) -> NewsFeedSnapshot:
    """Fetch raw XML/RSS/JSON news payload from a press feed."""
    url = feed_meta["url"]
    request = Request(url, method="GET")
    request.add_header(
        "User-Agent", "AP-Civic-Intelligence-Platform/1.0 (DailyNewsIngestor)"
    )
    try:
        with urlopen(request, timeout=timeout) as response:
            status = response.status
            content_type = response.headers.get(
                "Content-Type", "application/xml"
            )
            payload = response.read()
    except Exception as error:
        raise DailyNewsError(f"Failed to fetch news feed {url}: {error}") from error

    if status != 200:
        raise DailyNewsError(f"News feed {url} returned HTTP {status}")

    return NewsFeedSnapshot(
        key=feed_meta["key"],
        name=feed_meta["name"],
        publisher=feed_meta["publisher"],
        url=url,
        content_type=content_type,
        raw=payload,
        retrieved_at=datetime.now(UTC),
        default_classification=feed_meta.get(
            "default_classification", ValueClassification.OFFICIAL
        ),
    )


def parse_news_feed(snapshot: NewsFeedSnapshot) -> list[DailyNewsRecord]:
    """Parse XML/RSS or JSON payload into normalized daily news records."""
    records: list[DailyNewsRecord] = []
    raw_str = snapshot.raw.decode("utf-8", errors="replace").strip()

    if raw_str.startswith("{") or raw_str.startswith("["):
        try:
            data = json.loads(raw_str)
            items = data if isinstance(data, list) else data.get("items", [])
            for item in items:
                raw_id = item.get("id") or item.get("url")
                fallback_id = sha256(str(item).encode()).hexdigest()[:12]
                title = item.get("title") or item.get("headline") or "Notice"
                records.append(
                    DailyNewsRecord(
                        item_id=str(raw_id or fallback_id),
                        headline=str(title),
                        summary=str(
                            item.get("summary") or item.get("description") or ""
                        ),
                        article_url=str(
                            item.get("url") or item.get("link") or snapshot.url
                        ),
                        published_date=str(
                            item.get("published_date")
                            or snapshot.retrieved_at.date().isoformat()
                        ),
                        publisher=snapshot.publisher,
                        classification=snapshot.default_classification,
                    )
                )
            return records
        except Exception:
            pass

    try:
        root = ET.fromstring(snapshot.raw)
        channel = root.find("channel")
        items = (
            channel.findall("item")
            if channel is not None
            else root.findall(".//item")
        )
        if not items:
            items = root.findall(".//{http://www.w3.org/2005/Atom}entry")

        for item in items:
            title_text = item.findtext("title") or item.findtext(
                "{http://www.w3.org/2005/Atom}title"
            )
            desc_text = item.findtext("description") or item.findtext(
                "{http://www.w3.org/2005/Atom}summary"
            )
            link_text = item.findtext("link") or item.findtext(
                "{http://www.w3.org/2005/Atom}link"
            )
            guid_text = item.findtext("guid") or item.findtext(
                "{http://www.w3.org/2005/Atom}id"
            )
            pub_text = item.findtext("pubDate") or item.findtext(
                "{http://www.w3.org/2005/Atom}published"
            )

            headline = (
                title_text.strip()
                if title_text and title_text.strip()
                else "Press Bulletin"
            )
            summary = desc_text.strip() if desc_text else ""
            article_url = (
                link_text.strip()
                if link_text and link_text.strip()
                else snapshot.url
            )
            default_guid = sha256(headline.encode()).hexdigest()[:16]
            item_id = (
                guid_text.strip()
                if guid_text and guid_text.strip()
                else default_guid
            )
            default_pub = snapshot.retrieved_at.date().isoformat()
            pub_date = (
                pub_text.strip()
                if pub_text and pub_text.strip()
                else default_pub
            )

            records.append(
                DailyNewsRecord(
                    item_id=item_id,
                    headline=headline,
                    summary=summary,
                    article_url=article_url,
                    published_date=pub_date,
                    publisher=snapshot.publisher,
                    classification=snapshot.default_classification,
                )
            )
    except Exception:
        records.append(
            DailyNewsRecord(
                item_id=sha256(snapshot.raw).hexdigest()[:16],
                headline=snapshot.name,
                summary=raw_str[:300] + "...",
                article_url=snapshot.url,
                published_date=snapshot.retrieved_at.date().isoformat(),
                publisher=snapshot.publisher,
                classification=snapshot.default_classification,
            )
        )

    return records


def store_daily_news(
    session: Session,
    storage_dir: Path,
    snapshot: NewsFeedSnapshot,
    records: Sequence[DailyNewsRecord],
) -> NewsIngestionResult:
    """Store raw daily news snapshot, extraction run, and typed observations."""
    retrieved_on = snapshot.retrieved_at.date()

    source_id = _stable(f"daily-news-source:{snapshot.key}")
    source = session.get(SourceRecord, source_id)
    if source is None:
        source = SourceRecord(
            id=source_id,
            name=snapshot.name,
            publisher=snapshot.publisher,
            official_domain=urlsplit(snapshot.url).hostname or "news.ap.gov.in",
            source_type="press_release_feed",
            jurisdiction_code="IN-AP",
            access_method=AccessMethod.API,
            active_from=retrieved_on,
            review_status=ReviewStatus.REVIEWED,
        )
        session.add(source)
        session.flush()

    doc_id = _stable(f"daily-news-document:{snapshot.key}")
    document = session.get(SourceDocument, doc_id)
    if document is None:
        document = SourceDocument(
            id=doc_id,
            source_id=source.id,
            official_url=snapshot.url,
            title=snapshot.name,
            reporting_period_start=retrieved_on,
            reporting_period_end=retrieved_on,
            document_type="news_feed",
            language_code=LanguageCode.EN,
            jurisdiction_code="IN-AP",
            document_metadata={"adapter": "daily-news-ingestor"},
        )
        session.add(document)
        session.flush()

    checksum = sha256(snapshot.raw).hexdigest()
    existing = session.scalar(
        select(SourceSnapshot).where(
            SourceSnapshot.document_id == document.id,
            SourceSnapshot.sha256 == checksum,
        )
    )
    store = get_snapshot_store(storage_dir=storage_dir)
    if existing is not None:
        snapshot_row = existing
        stored = False
    else:
        key = snapshot_key(checksum, ".xml")
        if not store.exists(key):
            store.put(key, snapshot.raw)
        snapshot_row = SourceSnapshot(
            id=_stable(f"daily-news-snapshot:{snapshot.key}:{checksum}"),
            document_id=document.id,
            retrieved_at=snapshot.retrieved_at,
            http_status=200,
            content_type=snapshot.content_type,
            file_size_bytes=len(snapshot.raw),
            sha256=checksum,
            object_storage_key=key,
            retrieval_metadata={"url": snapshot.url},
        )
        session.add(snapshot_row)
        session.flush()
        stored = True

    run_id = _stable(f"daily-news-run:{snapshot_row.id}:{ADAPTER_VERSION}")
    run = session.get(ExtractionRun, run_id)
    if run is None:
        run = ExtractionRun(
            id=run_id,
            snapshot_id=snapshot_row.id,
            adapter_name="daily-news-adapter",
            adapter_version=ADAPTER_VERSION,
            started_at=snapshot.retrieved_at,
            completed_at=snapshot.retrieved_at,
            status=ExtractionStatus.SUCCEEDED,
            extracted_record_count=len(records),
            software_revision=SOFTWARE_REVISION,
        )
        session.add(run)
        session.flush()

    created_count = 0
    for record in records:
        entity_key = record.item_id
        entity_id = _stable(f"news_article:{entity_key}")

        fields = {
            "headline": record.headline,
            "summary": record.summary,
            "article_url": record.article_url,
            "published_date": record.published_date,
            "publisher": record.publisher,
        }

        for field_path, val in fields.items():
            obs_id = _stable(f"news-observation:{entity_key}:{field_path}")
            if session.get(SourceObservation, obs_id) is not None:
                continue
            session.add(
                SourceObservation(
                    id=obs_id,
                    entity_type="news_article",
                    entity_id=entity_id,
                    field_path=field_path,
                    value_text=val,
                    document_id=document.id,
                    snapshot_id=snapshot_row.id,
                    extraction_run_id=run.id,
                    classification=record.classification,
                    review_state=ObservationReviewState.REVIEWED,
                    valid_from=retrieved_on,
                    is_published=True,
                )
            )
            created_count += 1

            decision_id = _stable(f"news-review:{obs_id}")
            if session.get(ReviewDecision, decision_id) is None:
                session.add(
                    ReviewDecision(
                        id=decision_id,
                        observation_id=obs_id,
                        reviewer_identity="automated-daily-news-ingestor",
                        decision=ReviewDecisionType.APPROVE,
                        reason=(
                            "Automated press release ingestion from "
                            "registered government news portal."
                        ),
                        decided_at=snapshot.retrieved_at,
                    )
                )

    session.flush()
    return NewsIngestionResult(
        snapshots_stored=int(stored),
        observations_created=created_count,
        extraction_run_id=run.id,
        sha256=checksum,
    )
