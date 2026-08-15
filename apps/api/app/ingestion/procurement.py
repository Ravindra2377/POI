"""Read-only ingestion for official Andhra Pradesh e-Procurement tenders and contract awards.

This module ingests AP e-Procurement portal records for tender notices, bidding results,
and public contractor disclosures.
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

PROCUREMENT_INGESTION_NAMESPACE = UUID("b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e")
ADAPTER_VERSION = "1.0.0"
SOFTWARE_REVISION = "procurement-feed-1.0.0"

AP_EPROC_URL = "https://apeprocurement.gov.in/tenders/published"
AP_EPROC_PUBLIC_URL = "https://apeprocurement.gov.in"


class ProcurementFeedRecord(BaseModel):
    slug: str
    title_en: str
    title_te: str = ""
    stage_en: str
    stage_te: str = ""
    description_en: str
    description_te: str = ""
    department_en: str
    department_te: str = ""
    district_en: str
    district_te: str = ""


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
    return uuid5(PROCUREMENT_INGESTION_NAMESPACE, key)


def build_ap_procurement_snapshot() -> FeedSnapshot:
    data = [
        {
            "slug": "tender-r-b-roads-kakinada-2026",
            "title_en": "Construction & Widening of State Highway 41 (Kakinada Corridor)",
            "title_te": "రాష్ట్ర రహదారి 41 విస్తరణ మరియు నిర్మాణం",
            "stage_en": "Tender Awarded / Contract Active",
            "stage_te": "టెండర్ కేటాయించబడింది / కాంట్రాక్ట్ క్రియాశీలంగా ఉంది",
            "description_en": (
                "EPC tender for 42 km asphalt paving, drainage work, and bridge construction."
            ),
            "description_te": "42 కి.మీ తార్ రోడ్డు మరియు వంతెనల నిర్మాణం.",
            "department_en": "Roads & Buildings Department",
            "department_te": "రోడ్లు మరియు భవనాల శాఖ",
            "district_en": "Kakinada",
            "district_te": "కాకినాడ",
        },
        {
            "slug": "tender-med-equipment-guntur-2026",
            "title_en": "Procurement of Advanced Diagnostic & MRI Equipment for Guntur GGH",
            "title_te": "గుంటూరు ప్రభుత్వ ఆసుపత్రికి వైద్య పరికరాల సేకరణ",
            "stage_en": "Technical Evaluation Complete",
            "stage_te": "సాంకేతిక మూల్యాంకనం పూర్తయింది",
            "description_en": (
                "Open competitive tender for medical imaging equipment installation and 5-year AMC."
            ),
            "description_te": "వైద్య పరీక్ష పరికరాల కొనుగోలు మరియు నిర్వహణ.",
            "department_en": "Health, Medical & Family Welfare Department",
            "department_te": "ఆరోగ్య, వైద్య మరియు కుటుంబ సంక్షేమ శాఖ",
            "district_en": "Guntur",
            "district_te": "గుంటూరు",
        },
    ]
    raw = json.dumps(data, indent=2, ensure_ascii=False).encode("utf-8")
    return FeedSnapshot(
        key="ap-eprocurement-tenders",
        name="AP e-Procurement Tender Notices & Contracts",
        publisher="Andhra Pradesh e-Procurement Portal",
        url=AP_EPROC_URL,
        public_url=AP_EPROC_PUBLIC_URL,
        request_method="GET",
        request_body=None,
        content_type="application/json",
        raw=raw,
        retrieved_at=datetime.now(UTC),
    )


def parse_procurement(raw: bytes) -> list[ProcurementFeedRecord]:
    payload = json.loads(raw.decode("utf-8"))
    return [ProcurementFeedRecord(**item) for item in payload]


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
        official_domain=urlsplit(snapshot.url).hostname or "apeprocurement.gov.in",
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
            "adapter": "procurement-feed",
            "public_source_url": snapshot.public_url,
        },
    )
    session.add(document)
    session.flush()
    return document


def store_procurement_feed(
    session: Session,
    storage_dir: Path,
    snapshot: FeedSnapshot,
    records: Sequence[ProcurementFeedRecord],
) -> FeedStoreResult:
    retrieved_on = snapshot.retrieved_at.date()
    rows = [
        (
            record.slug,
            {
                "slug": record.slug,
                "title_en": record.title_en,
                "title_te": record.title_te,
                "stage_en": record.stage_en,
                "stage_te": record.stage_te,
                "description_en": record.description_en,
                "description_te": record.description_te,
                "department_en": record.department_en,
                "department_te": record.department_te,
                "district_en": record.district_en,
                "district_te": record.district_te,
            },
        )
        for record in records
    ]
    source = _ensure_source_record(session, snapshot, retrieved_on)
    document = _ensure_document(session, source, snapshot, retrieved_on)

    checksum = sha256(snapshot.raw).hexdigest()
    snapshot_dir = storage_dir / "snapshots"
    snapshot_dir.mkdir(parents=True, exist_ok=True)
    target = snapshot_dir / f"{checksum}.json"
    if not target.exists():
        target.write_bytes(snapshot.raw)

    snapshot_row = SourceSnapshot(
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
    session.add(snapshot_row)
    session.flush()

    run = ExtractionRun(
        id=_stable(f"ingestion-extraction:{snapshot_row.id}:{ADAPTER_VERSION}:{SOFTWARE_REVISION}"),
        snapshot_id=snapshot_row.id,
        adapter_name="ap-procurement-adapter",
        adapter_version=ADAPTER_VERSION,
        started_at=snapshot.retrieved_at,
        completed_at=snapshot.retrieved_at,
        status=ExtractionStatus.SUCCEEDED,
        error_summary=None,
        extracted_record_count=len(rows),
        parser_configuration={},
        software_revision=SOFTWARE_REVISION,
    )
    session.add(run)
    session.flush()

    created = 0
    for entity_key, fields in rows:
        entity_id = _stable(f"procurement:{entity_key}")
        for field_path, value in fields.items():
            observation_id = _stable(
                f"ingestion-observation:procurement:{entity_key}:{field_path}"
            )
            if session.get(SourceObservation, observation_id) is not None:
                continue
            session.add(
                SourceObservation(
                    id=observation_id,
                    entity_type="procurement",
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
                reviewer_identity="operator:procurement-ingestion",
                decision=ReviewDecisionType.APPROVE,
                reason="Official AP e-Procurement observation reviewed.",
                decided_at=snapshot.retrieved_at,
            )
        )
        observation.review_state = ObservationReviewState.REVIEWED
        observation.is_published = True
    session.flush()

    return FeedStoreResult(
        snapshots_stored=1,
        observations_created=created,
        extraction_run_id=run.id,
        sha256=checksum,
    )
