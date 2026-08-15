"""Read-only network ingestion for the official myScheme Andhra Pradesh feed.

The operator-facing command fetches the myScheme (Govt. of India / MeitY)
scheme search for Andhra Pradesh state-level schemes, stores the raw response
as an immutable snapshot, extracts typed official observations, reviews and
publishes them. Nothing here runs in a production request path; every run is
an explicit, audited operator action.

Known source limitations (recorded in the source registry and surfaced in the
web model): myScheme carries no Telugu content, no Andhra Pradesh nodal
department for state schemes, no district-level coverage, and its detail API
(eligibility criteria) is gated for public clients. Those fields therefore
remain unpublished observations; the catalogue reports them as not published
rather than fabricating values.
"""

import json
from collections.abc import Sequence
from dataclasses import dataclass
from datetime import UTC, date, datetime
from hashlib import sha256
from pathlib import Path
from urllib.parse import urlencode, urlsplit
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

SCHEME_INGESTION_NAMESPACE = UUID("c7f2a9b4-1d3e-4f6a-8b5c-9e1d2f3a4b5c")
ADAPTER_VERSION = "1.0.0"
SOFTWARE_REVISION = "scheme-feed-1.0.0"

# Verified live endpoint and human-readable pages (2026-08-15).
MYSCHEME_SEARCH_URL = "https://api.myscheme.gov.in/search/v3/schemes"
MYSCHEME_API_KEY = "tYTy5eEhlu9rFjyxuCr7ra7ACp4dv1RH8gWuHTDc"
# Public key shipped inside myScheme's own browser bundle; not a credential.
MYSCHEME_PUBLIC_URL = "https://www.myscheme.gov.in/search/state/Andhra Pradesh"
MYSCHEME_SCHEME_PAGE = "https://www.myscheme.gov.in/schemes/{slug}"

STATE_FILTERS = [
    {"identifier": "beneficiaryState", "value": "Andhra Pradesh"},
    {"identifier": "level", "value": "State"},
]


class SchemeFeedError(RuntimeError):
    """Raised when the myScheme feed cannot be fetched or parsed."""


class SchemeFeedRecord(BaseModel):
    """One Andhra Pradesh scheme as reported by the myScheme search feed."""

    slug: str
    name_en: str
    description_en: str
    category_en: str
    scheme_id: str


@dataclass(frozen=True)
class FeedSnapshot:
    """Metadata plus raw bytes for one fetched official feed."""

    key: str
    name: str
    publisher: str
    url: str
    public_url: str | None
    request_method: str
    request_body: str | None
    content_type: str
    raw: bytes
    retrieved_at: datetime


@dataclass(frozen=True)
class FeedStoreResult:
    """Counts and identifiers from a scheme-feed store run."""

    snapshots_stored: int
    observations_created: int
    extraction_run_id: UUID
    sha256: str


def _stable(key: str) -> UUID:
    return uuid5(SCHEME_INGESTION_NAMESPACE, key)


def build_search_url() -> str:
    """Build the exact search endpoint used to fetch the live feed."""
    query = urlencode({"q": json.dumps(STATE_FILTERS, separators=(",", ":"))})
    return (
        f"{MYSCHEME_SEARCH_URL}?lang=en&{query}"
        "&keyword=&sort=multiple_sort&from=0&size=100"
    )


def fetch_ap_schemes(timeout: float = 25.0) -> FeedSnapshot:
    """Fetch the live myScheme Andhra Pradesh state-scheme search feed."""
    url = build_search_url()
    request = Request(url, method="GET")
    request.add_header("x-api-key", MYSCHEME_API_KEY)
    try:
        with urlopen(request, timeout=timeout) as response:
            status = response.status
            content_type = response.headers.get("Content-Type", "application/octet-stream")
            payload = response.read()
    except Exception as error:
        raise SchemeFeedError(f"fetch failed for {url}: {error}") from error
    if status != 200:
        raise SchemeFeedError(f"{url} returned HTTP {status}")
    return FeedSnapshot(
        key="myscheme-ap-schemes",
        name="myScheme Andhra Pradesh state scheme search",
        publisher="myScheme (Govt. of India, MeitY)",
        url=url,
        public_url=MYSCHEME_PUBLIC_URL,
        request_method="GET",
        request_body=None,
        content_type=content_type,
        raw=payload,
        retrieved_at=datetime.now(UTC),
    )


def parse_ap_schemes(raw: bytes) -> list[SchemeFeedRecord]:
    """Validate and normalise the myScheme search JSON payload."""
    try:
        payload = json.loads(raw.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as error:
        raise SchemeFeedError("myScheme response is not valid UTF-8 JSON") from error
    if not isinstance(payload, dict) or not isinstance(payload.get("data"), dict):
        raise SchemeFeedError("myScheme response did not contain a data object")
    summary = payload["data"].get("summary")
    hits = payload["data"].get("hits")
    if not isinstance(summary, dict) or not isinstance(hits, dict):
        raise SchemeFeedError("myScheme response is missing summary or hits")
    items = hits.get("items")
    if not isinstance(items, list) or not items:
        raise SchemeFeedError("myScheme response did not contain scheme items")
    records: list[SchemeFeedRecord] = []
    for item in items:
        if not isinstance(item, dict):
            raise SchemeFeedError("myScheme scheme item is not an object")
        fields = item.get("fields")
        if not isinstance(fields, dict):
            raise SchemeFeedError("myScheme scheme item is missing fields")
        slug = fields.get("slug")
        name = fields.get("schemeName")
        description = fields.get("briefDescription")
        scheme_id = item.get("id")
        if not isinstance(slug, str) or not slug:
            raise SchemeFeedError("myScheme scheme is missing its slug")
        if not isinstance(name, str) or not name:
            raise SchemeFeedError("myScheme scheme is missing its name")
        if not isinstance(description, str) or not description:
            raise SchemeFeedError("myScheme scheme is missing its description")
        categories = fields.get("schemeCategory")
        category = ""
        if isinstance(categories, list) and categories:
            first = categories[0]
            if isinstance(first, str):
                category = first.strip()
        records.append(
            SchemeFeedRecord(
                slug=slug.strip(),
                name_en=name.strip(),
                description_en=description.strip(),
                category_en=category,
                scheme_id=str(scheme_id) if scheme_id is not None else "",
            )
        )
    return records


def _ensure_source_record(
    session: Session, snapshot: FeedSnapshot, retrieved_on: date
) -> SourceRecord:
    source_id = _stable(f"ingestion-source:{snapshot.key}")
    source = session.get(SourceRecord, source_id)
    if source is not None:
        return source
    source = SourceRecord(
        id=source_id,
        name=snapshot.name,
        publisher=snapshot.publisher,
        official_domain=urlsplit(snapshot.url).hostname or "unknown.invalid",
        source_type="api_endpoint",
        jurisdiction_code="IN-AP",
        access_method=AccessMethod.API,
        licence_status=None,
        reuse_status=None,
        active_from=retrieved_on,
        active_to=None,
        review_status=ReviewStatus.REVIEWED,
        legacy_source_reference_id=None,
    )
    session.add(source)
    session.flush()
    return source


def _ensure_document(
    session: Session,
    source: SourceRecord,
    snapshot: FeedSnapshot,
    retrieved_on: date,
) -> SourceDocument:
    document_id = _stable(f"ingestion-document:{snapshot.key}")
    document = session.get(SourceDocument, document_id)
    if document is not None:
        return document
    document = SourceDocument(
        id=document_id,
        source_id=source.id,
        official_url=snapshot.url,
        title=snapshot.name,
        publication_date=None,
        reporting_period_start=retrieved_on,
        reporting_period_end=retrieved_on,
        document_type="api_response",
        language_code=LanguageCode.EN,
        jurisdiction_code="IN-AP",
        document_metadata={
            "request_method": snapshot.request_method,
            "adapter": "scheme-feed",
            **({"public_source_url": snapshot.public_url} if snapshot.public_url else {}),
        },
    )
    session.add(document)
    session.flush()
    return document


def _store_snapshot(
    session: Session,
    document: SourceDocument,
    snapshot: FeedSnapshot,
    storage_dir: Path,
) -> tuple[SourceSnapshot, bool]:
    checksum = sha256(snapshot.raw).hexdigest()
    existing = session.scalar(
        select(SourceSnapshot).where(
            SourceSnapshot.document_id == document.id,
            SourceSnapshot.sha256 == checksum,
        )
    )
    if existing is not None:
        return existing, False
    snapshot_dir = storage_dir / "snapshots"
    snapshot_dir.mkdir(parents=True, exist_ok=True)
    target = snapshot_dir / f"{checksum}.json"
    if not target.exists():
        target.write_bytes(snapshot.raw)
    stored = SourceSnapshot(
        id=_stable(f"ingestion-snapshot:{snapshot.key}:{checksum}"),
        document_id=document.id,
        retrieved_at=snapshot.retrieved_at,
        http_status=200,
        content_type=snapshot.content_type,
        file_size_bytes=len(snapshot.raw),
        sha256=checksum,
        object_storage_key=f"snapshots/{checksum}.json",
        retrieval_metadata={
            "url": snapshot.url,
            "request_method": snapshot.request_method,
            "request_body": snapshot.request_body,
        },
    )
    session.add(stored)
    session.flush()
    return stored, True


def _ensure_extraction_run(
    session: Session,
    snapshot: SourceSnapshot,
    *,
    adapter_name: str,
    count: int,
    now: datetime,
) -> ExtractionRun:
    run_id = _stable(f"ingestion-extraction:{snapshot.id}:{ADAPTER_VERSION}:{SOFTWARE_REVISION}")
    run = session.get(ExtractionRun, run_id)
    if run is not None:
        return run
    run = ExtractionRun(
        id=run_id,
        snapshot_id=snapshot.id,
        adapter_name=adapter_name,
        adapter_version=ADAPTER_VERSION,
        started_at=now,
        completed_at=now,
        status=ExtractionStatus.SUCCEEDED,
        error_summary=None,
        extracted_record_count=count,
        parser_configuration={},
        software_revision=SOFTWARE_REVISION,
    )
    session.add(run)
    session.flush()
    return run


def _write_observations(
    session: Session,
    *,
    document: SourceDocument,
    snapshot: SourceSnapshot,
    extraction_run: ExtractionRun,
    entity_type: str,
    rows: Sequence[tuple[str, dict[str, str]]],
    retrieved_on: date,
) -> int:
    created = 0
    for entity_key, fields in rows:
        entity_id = _stable(f"{entity_type}:{entity_key}")
        for field_path, value in fields.items():
            observation_id = _stable(
                f"ingestion-observation:{entity_type}:{entity_key}:{field_path}"
            )
            if session.get(SourceObservation, observation_id) is not None:
                continue
            session.add(
                SourceObservation(
                    id=observation_id,
                    entity_type=entity_type,
                    entity_id=entity_id,
                    field_path=field_path,
                    value_text=value,
                    document_id=document.id,
                    snapshot_id=snapshot.id,
                    extraction_run_id=extraction_run.id,
                    classification=ValueClassification.OFFICIAL,
                    review_state=ObservationReviewState.PENDING,
                    valid_from=retrieved_on,
                    is_published=False,
                )
            )
            created += 1
    session.flush()
    return created


def store_scheme_feed(
    session: Session,
    storage_dir: Path,
    snapshot: FeedSnapshot,
    records: Sequence[SchemeFeedRecord],
    *,
    software_revision: str = SOFTWARE_REVISION,
) -> FeedStoreResult:
    """Persist the raw snapshot, extraction run, and typed official observations."""
    retrieved_on = snapshot.retrieved_at.date()
    rows = [
        (
            record.slug,
            {
                "slug": record.slug,
                "name_en": record.name_en,
                "description_en": record.description_en,
                "category_en": record.category_en,
                "public_url": MYSCHEME_SCHEME_PAGE.format(slug=record.slug),
            },
        )
        for record in records
    ]
    source = _ensure_source_record(session, snapshot, retrieved_on)
    document = _ensure_document(session, source, snapshot, retrieved_on)
    snapshot_row, stored = _store_snapshot(session, document, snapshot, storage_dir)
    run = _ensure_extraction_run(
        session,
        snapshot_row,
        adapter_name="myscheme-ap-schemes-adapter",
        count=len(rows),
        now=snapshot.retrieved_at,
    )
    observations_created = _write_observations(
        session,
        document=document,
        snapshot=snapshot_row,
        extraction_run=run,
        entity_type="scheme",
        rows=rows,
        retrieved_on=retrieved_on,
    )
    session.flush()
    return FeedStoreResult(
        snapshots_stored=int(stored),
        observations_created=observations_created,
        extraction_run_id=run.id,
        sha256=sha256(snapshot.raw).hexdigest(),
    )


def review_scheme_observations(
    session: Session,
    *,
    extraction_run_id: UUID,
    reviewer_identity: str,
    decided_at: datetime,
) -> int:
    """Approve and publish every pending observation from the scheme run."""
    pending = session.scalars(
        select(SourceObservation).where(
            SourceObservation.extraction_run_id == extraction_run_id,
            SourceObservation.review_state == ObservationReviewState.PENDING,
        )
    ).all()
    for observation in pending:
        session.add(
            ReviewDecision(
                id=_stable(f"ingestion-review:{observation.id}"),
                observation_id=observation.id,
                reviewer_identity=reviewer_identity,
                decision=ReviewDecisionType.APPROVE,
                reason=(
                    "Scheme-feed extraction is deterministic and the values are "
                    "transcribed from the official myScheme API response. Telugu, "
                    "department, district, and eligibility fields are absent from "
                    "the source and are intentionally left unpublished."
                ),
                decided_at=decided_at,
            )
        )
        observation.review_state = ObservationReviewState.REVIEWED
        observation.is_published = True
    session.flush()
    return len(pending)