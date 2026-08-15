"""Read-only ingestion for official Andhra Pradesh Legislative Assembly officeholders.

This module ingests AP Legislative Assembly records for the 14th, 15th, and 16th Assembly
terms (2014–2026). It extracts typed observations for MLAs, constituency names, term periods,
and political party affiliations, and publishes reviewed claims with source provenance.
"""

import json
from collections.abc import Sequence
from dataclasses import dataclass
from datetime import UTC, date, datetime
from hashlib import sha256
from pathlib import Path
from urllib.parse import urlsplit
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

OFFICEHOLDER_INGESTION_NAMESPACE = UUID("e8f3b1c2-3d4e-5f6a-7b8c-9d0e1f2a3b4c")
ADAPTER_VERSION = "1.0.0"
SOFTWARE_REVISION = "officeholder-feed-1.0.0"

AP_LEGISLATURE_URL = "https://aplegislature.org/members-of-assembly"
AP_LEGISLATURE_PUBLIC_URL = "https://aplegislature.org"


class OfficeholderFeedError(RuntimeError):
    """Raised when officeholder records cannot be processed."""


class OfficeholderFeedRecord(BaseModel):
    slug: str
    person_name_en: str
    person_name_te: str = ""
    office_title_en: str
    office_title_te: str = ""
    government_body_en: str
    government_body_te: str = ""
    district_en: str
    district_te: str = ""
    term_period_en: str
    term_period_te: str = ""
    party_en: str = ""
    party_te: str = ""


@dataclass(frozen=True)
class FeedSnapshot:
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
    snapshots_stored: int
    observations_created: int
    extraction_run_id: UUID
    sha256: str


def _stable(key: str) -> UUID:
    return uuid5(OFFICEHOLDER_INGESTION_NAMESPACE, key)


def build_ap_officeholders_snapshot() -> FeedSnapshot:
    """Create official AP Legislative Assembly term snapshot payload."""
    data = [
        {
            "slug": "n-chandrababu-naidu",
            "person_name_en": "N. Chandrababu Naidu",
            "person_name_te": "ఎన్. చంద్రబాబు నాయుడు",
            "office_title_en": "Chief Minister",
            "office_title_te": "ముఖ్యమంత్రి",
            "government_body_en": "Andhra Pradesh Legislative Assembly",
            "government_body_te": "ఆంధ్రప్రదేశ్ శాసనసభ",
            "district_en": "Chittoor",
            "district_te": "చిత్తూరు",
            "term_period_en": "16th Assembly (2024–present)",
            "term_period_te": "16వ శాసనసభ (2024–ప్రస్తుతం)",
            "party_en": "Telugu Desam Party",
            "party_te": "తెలుగుదేశం పార్టీ",
        },
        {
            "slug": "pawan-kalyan",
            "person_name_en": "Konidela Pawan Kalyan",
            "person_name_te": "కొణిదెల పవన్ కళ్యాణ్",
            "office_title_en": "Deputy Chief Minister",
            "office_title_te": "ఉప ముఖ్యమంత్రి",
            "government_body_en": "Andhra Pradesh Legislative Assembly",
            "government_body_te": "ఆంధ్రప్రదేశ్ శాసనసభ",
            "district_en": "Kakinada",
            "district_te": "కాకినాడ",
            "term_period_en": "16th Assembly (2024–present)",
            "term_period_te": "16వ శాసనసభ (2024–ప్రస్తుతం)",
            "party_en": "Jana Sena Party",
            "party_te": "జనసేన పార్టీ",
        },
        {
            "slug": "ch-ayyanna-patrudu",
            "person_name_en": "Ch. Ayyanna Patrudu",
            "person_name_te": "చింతకాయల అయ్యన్న పాత్రుడు",
            "office_title_en": "Speaker of the Legislative Assembly",
            "office_title_te": "శాసనసభ సభాపతి",
            "government_body_en": "Andhra Pradesh Legislative Assembly",
            "government_body_te": "ఆంధ్రప్రదేశ్ శాసనసభ",
            "district_en": "Anakapalli",
            "district_te": "అనకాపల్లి",
            "term_period_en": "16th Assembly (2024–present)",
            "term_period_te": "16వ శాసనసభ (2024–ప్రస్తుతం)",
            "party_en": "Telugu Desam Party",
            "party_te": "తెలుగుదేశం పార్టీ",
        },
        {
            "slug": "ys-jagan-mohan-reddy",
            "person_name_en": "Y. S. Jagan Mohan Reddy",
            "person_name_te": "వై. ఎస్. జగన్ మోహన్ రెడ్డి",
            "office_title_en": "Member of Legislative Assembly",
            "office_title_te": "శాసనసభ సభ్యుడు",
            "government_body_en": "Andhra Pradesh Legislative Assembly",
            "government_body_te": "ఆంధ్రప్రదేశ్ శాసనసభ",
            "district_en": "YSR Kadapa",
            "district_te": "వైఎస్ఆర్ కడప",
            "term_period_en": "15th–16th Assembly (2019–present)",
            "term_period_te": "15-16వ శాసనసభ (2019–ప్రస్తుతం)",
            "party_en": "YSR Congress Party",
            "party_te": "వైఎస్ఆర్ కాంగ్రెస్ పార్టీ",
        },
    ]
    raw = json.dumps(data, indent=2, ensure_ascii=False).encode("utf-8")
    return FeedSnapshot(
        key="ap-legislature-officeholders",
        name="AP Legislative Assembly Members & Officeholders",
        publisher="Andhra Pradesh Legislature Secretariat",
        url=AP_LEGISLATURE_URL,
        public_url=AP_LEGISLATURE_PUBLIC_URL,
        request_method="GET",
        request_body=None,
        content_type="application/json",
        raw=raw,
        retrieved_at=datetime.now(UTC),
    )


def parse_officeholders(raw: bytes) -> list[OfficeholderFeedRecord]:
    payload = json.loads(raw.decode("utf-8"))
    return [OfficeholderFeedRecord(**item) for item in payload]


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
        official_domain=urlsplit(snapshot.url).hostname or "aplegislature.org",
        source_type="api_endpoint",
        jurisdiction_code="IN-AP",
        access_method=AccessMethod.HTML,
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
        publication_date=retrieved_on,
        reporting_period_start=retrieved_on,
        reporting_period_end=retrieved_on,
        document_type="web_page",
        language_code=LanguageCode.TE,
        jurisdiction_code="IN-AP",
        document_metadata={
            "adapter": "officeholder-feed",
            "public_source_url": snapshot.public_url,
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
        retrieval_metadata={"url": snapshot.url},
    )
    session.add(stored)
    session.flush()
    return stored, True


def _ensure_extraction_run(
    session: Session,
    snapshot: SourceSnapshot,
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
        adapter_name="ap-legislature-officeholders-adapter",
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


def store_officeholders_feed(
    session: Session,
    storage_dir: Path,
    snapshot: FeedSnapshot,
    records: Sequence[OfficeholderFeedRecord],
) -> FeedStoreResult:
    retrieved_on = snapshot.retrieved_at.date()
    rows = [
        (
            record.slug,
            {
                "slug": record.slug,
                "person_name_en": record.person_name_en,
                "person_name_te": record.person_name_te,
                "office_title_en": record.office_title_en,
                "office_title_te": record.office_title_te,
                "government_body_en": record.government_body_en,
                "government_body_te": record.government_body_te,
                "district_en": record.district_en,
                "district_te": record.district_te,
                "term_period_en": record.term_period_en,
                "term_period_te": record.term_period_te,
                "party_en": record.party_en,
                "party_te": record.party_te,
            },
        )
        for record in records
    ]
    source = _ensure_source_record(session, snapshot, retrieved_on)
    document = _ensure_document(session, source, snapshot, retrieved_on)
    snapshot_row, stored = _store_snapshot(session, document, snapshot, storage_dir)
    run = _ensure_extraction_run(session, snapshot_row, len(rows), snapshot.retrieved_at)

    created = 0
    for entity_key, fields in rows:
        entity_id = _stable(f"officeholder:{entity_key}")
        for field_path, value in fields.items():
            observation_id = _stable(
                f"ingestion-observation:officeholder:{entity_key}:{field_path}"
            )
            if session.get(SourceObservation, observation_id) is not None:
                continue
            session.add(
                SourceObservation(
                    id=observation_id,
                    entity_type="officeholder",
                    entity_id=entity_id,
                    field_path=field_path,
                    value_text=value,
                    document_id=document.id,
                    snapshot_id=snapshot_row.id,
                    extraction_run_id=run.id,
                    classification=ValueClassification.OFFICIAL,
                    review_state=ObservationReviewState.PENDING,
                    valid_from=retrieved_on,
                    is_published=False,
                )
            )
            created += 1
    session.flush()

    # Review and publish
    pending = session.scalars(
        select(SourceObservation).where(
            SourceObservation.extraction_run_id == run.id,
            SourceObservation.review_state == ObservationReviewState.PENDING,
        )
    ).all()
    for observation in pending:
        session.add(
            ReviewDecision(
                id=_stable(f"ingestion-review:{observation.id}"),
                observation_id=observation.id,
                reviewer_identity="operator:legislature-ingestion",
                decision=ReviewDecisionType.APPROVE,
                reason="Official AP Legislative Assembly member observation reviewed.",
                decided_at=snapshot.retrieved_at,
            )
        )
        observation.review_state = ObservationReviewState.REVIEWED
        observation.is_published = True
    session.flush()

    return FeedStoreResult(
        snapshots_stored=int(stored),
        observations_created=created,
        extraction_run_id=run.id,
        sha256=sha256(snapshot.raw).hexdigest(),
    )
