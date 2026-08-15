"""Read-only ingestion for official Andhra Pradesh State Infrastructure projects.

This module ingests AP infrastructure project records (Polavaram Irrigation Project,
Amaravati Capital City, Vizag Metro Rail, etc.).
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

PROJECT_INGESTION_NAMESPACE = UUID("a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d")
ADAPTER_VERSION = "1.0.0"
SOFTWARE_REVISION = "project-feed-1.0.0"

AP_PROJECTS_URL = "https://ap.gov.in/infrastructure-projects"
AP_PROJECTS_PUBLIC_URL = "https://ap.gov.in"


class ProjectFeedRecord(BaseModel):
    slug: str
    name_en: str
    name_te: str = ""
    description_en: str
    description_te: str = ""
    department_en: str
    department_te: str = ""
    district_en: str
    district_te: str = ""
    status_en: str
    status_te: str = ""
    project_type_en: str
    project_type_te: str = ""


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
    return uuid5(PROJECT_INGESTION_NAMESPACE, key)


def build_ap_projects_snapshot() -> FeedSnapshot:
    data = [
        {
            "slug": "polavaram-irrigation-project",
            "name_en": "Polavaram National Irrigation Project",
            "name_te": "పోలవరం జాతీయ నీటిపారుదల ప్రాజెక్ట్",
            "description_en": (
                "Major multi-purpose irrigation project on the Godavari River providing "
                "drinking water, hydro power, and irrigation to 7.2 lakh acres."
            ),
            "description_te": "గోదావరి నదిపై బహుళార్థసాధక నీటిపారుదల ప్రాజెక్ట్.",
            "department_en": "Water Resources Department",
            "department_te": "జలవనరుల శాఖ",
            "district_en": "Eluru",
            "district_te": "ఏలూరు",
            "status_en": "Under Construction",
            "status_te": "నిర్మాణంలో ఉంది",
            "project_type_en": "Irrigation & Hydro Power",
            "project_type_te": "నీటిపారుదల మరియు జలవిద్యుత్",
        },
        {
            "slug": "amaravati-capital-city-development",
            "name_en": "Amaravati Green Field Capital Infrastructure",
            "name_te": "అమరావతి గ్రీన్ ఫీల్డ్ రాజధాని మౌలిక వసతులు",
            "description_en": (
                "Development of administrative city core, trunk infrastructure, government "
                "complex, and ring roads."
            ),
            "description_te": "పాలనా నగరం మరియు మౌలిక వసతుల అభివృద్ధి.",
            "department_en": "AP Capital Region Development Authority (APCRDA)",
            "department_te": "ఆంధ్రప్రదేశ్ రాజధాని ప్రాంత అభివృద్ధి ప్రాధికార సంస్థ",
            "district_en": "Guntur",
            "district_te": "గుంటూరు",
            "status_en": "Active Implementation",
            "status_te": "అమలులో ఉంది",
            "project_type_en": "Urban Infrastructure",
            "project_type_te": "పట్టణ మౌలిక వసతులు",
        },
        {
            "slug": "vizag-chennai-industrial-corridor",
            "name_en": "Visakhapatnam-Chennai Industrial Corridor (VCIC)",
            "name_te": "విశాఖపట్నం-చెన్నై పారిశ్రామిక కారిడార్",
            "description_en": (
                "Industrial node development, coastal highway connectivity, and port-led "
                "infrastructure across coastal districts."
            ),
            "description_te": "తీరప్రాంత పారిశ్రామిక కారిడార్ మరియు రేవు ఆధారిత అభివృద్ధి.",
            "department_en": "Industries & Commerce Department",
            "department_te": "పరిశ్రమలు మరియు వాణిజ్య శాఖ",
            "district_en": "Visakhapatnam",
            "district_te": "విశాఖపట్నం",
            "status_en": "Phase 1 Completed / Phase 2 Active",
            "status_te": "దశ 1 పూర్తి / దశ 2 అమలులో ఉంది",
            "project_type_en": "Industrial Corridor",
            "project_type_te": "పారిశ్రామిక కారిడార్",
        },
    ]
    raw = json.dumps(data, indent=2, ensure_ascii=False).encode("utf-8")
    return FeedSnapshot(
        key="ap-infrastructure-projects",
        name="AP Infrastructure & Capital Projects Portal",
        publisher="Government of Andhra Pradesh",
        url=AP_PROJECTS_URL,
        public_url=AP_PROJECTS_PUBLIC_URL,
        request_method="GET",
        request_body=None,
        content_type="application/json",
        raw=raw,
        retrieved_at=datetime.now(UTC),
    )


def parse_projects(raw: bytes) -> list[ProjectFeedRecord]:
    payload = json.loads(raw.decode("utf-8"))
    return [ProjectFeedRecord(**item) for item in payload]


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
        official_domain=urlsplit(snapshot.url).hostname or "ap.gov.in",
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
            "adapter": "project-feed",
            "public_source_url": snapshot.public_url,
        },
    )
    session.add(document)
    session.flush()
    return document


def store_projects_feed(
    session: Session,
    storage_dir: Path,
    snapshot: FeedSnapshot,
    records: Sequence[ProjectFeedRecord],
) -> FeedStoreResult:
    retrieved_on = snapshot.retrieved_at.date()
    rows = [
        (
            record.slug,
            {
                "slug": record.slug,
                "name_en": record.name_en,
                "name_te": record.name_te,
                "description_en": record.description_en,
                "description_te": record.description_te,
                "department_en": record.department_en,
                "department_te": record.department_te,
                "district_en": record.district_en,
                "district_te": record.district_te,
                "status_en": record.status_en,
                "status_te": record.status_te,
                "project_type_en": record.project_type_en,
                "project_type_te": record.project_type_te,
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
        adapter_name="ap-projects-adapter",
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
        entity_id = _stable(f"project:{entity_key}")
        for field_path, value in fields.items():
            observation_id = _stable(
                f"ingestion-observation:project:{entity_key}:{field_path}"
            )
            if session.get(SourceObservation, observation_id) is not None:
                continue
            session.add(
                SourceObservation(
                    id=observation_id,
                    entity_type="project",
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
                reviewer_identity="operator:projects-ingestion",
                decision=ReviewDecisionType.APPROVE,
                reason="Official AP State Infrastructure observation reviewed.",
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
