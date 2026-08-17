"""Read-only network ingestion for the official Andhra Pradesh district feeds.

The operator-facing command fetches the live Local Government Directory
district list (POST) and the Andhra Pradesh State Portal district directory
(GET), stores the raw responses as immutable snapshots, extracts typed official
observations, reviews and publishes them, and finally publishes the two
districts the Stage 1 baseline deliberately deferred (Markapuram and
Polavaram). Nothing here runs in a production request path; every run is an
explicit, audited operator action.
"""

import json
from collections.abc import Sequence
from dataclasses import dataclass
from datetime import UTC, date, datetime
from hashlib import sha256
from pathlib import Path
from urllib.parse import urlsplit
from urllib.request import Request, urlopen
from uuid import UUID, uuid5

from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.enums import (
    AccessMethod,
    ExtractionStatus,
    GeographyRelationshipType,
    GeographyType,
    LanguageCode,
    ObservationReviewState,
    ReviewDecisionType,
    ReviewStatus,
    ValueClassification,
)
from app.models.geography import Geography, GeographyRelationship
from app.models.provenance import (
    ExtractionRun,
    ReviewDecision,
    SourceDocument,
    SourceObservation,
    SourceRecord,
    SourceSnapshot,
)
from app.models.source import SourceReference
from app.seeds.seed_stage1 import (
    AP_DISTRICT_URL,
    LGD_DISTRICT_URL,
    SEED_NAMESPACE,
    load_manifest,
)
from app.storage import SnapshotStore, get_snapshot_store, snapshot_key

INGESTION_NAMESPACE = UUID("b3f0c1e2-4d5a-4b6c-9e7f-8a0b1c2d3e4f")
LGD_STATE_CODE = "28"
LGD_REQUEST_BODY = "stateCode=28"
ADAPTER_VERSION = "1.0.0"
SOFTWARE_REVISION = "district-feed-1.0.0"

# Human-readable official pages for the feeds themselves; the recorded evidence
# URL remains the machine endpoint in FeedSnapshot.url.
LGD_PUBLIC_URL = "https://lgdirectory.gov.in/"
AP_PORTAL_PUBLIC_URL = "https://www.ap.gov.in/"

# Verified official district-portal pages for the two deferred districts.
DEFERRED_DISTRICT_PUBLIC_URLS = {
    "markapuram": "https://markapuram.ap.gov.in/",
    "polavaram": "https://polavaram.ap.gov.in/",
}

# The two districts recorded by the live LGD feed that the reviewed Stage 1
# baseline deliberately deferred; ingestion publishes them with audited review.
DEFERRED_DISTRICTS: tuple[dict[str, str], ...] = (
    {
        "slug": "markapuram",
        "name_en": "Markapuram",
        "name_te": "మార్కాపురం",
        "lgd_code": "790",
    },
    {
        "slug": "polavaram",
        "name_en": "Polavaram",
        "name_te": "పోలవరం",
        "lgd_code": "791",
    },
)


class DistrictFeedError(RuntimeError):
    """Raised when an official feed cannot be fetched or parsed."""


class DistrictFeedRecord(BaseModel):
    """One district as reported by the LGD district-list feed."""

    lgd_code: str
    name_en: str
    name_local: str
    ap_portal_code: str | None = None


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
    """Counts and identifiers from a district-feed store run."""

    snapshots_stored: int
    observations_created: int
    extraction_run_ids: tuple[UUID, ...]
    lgd_sha256: str
    lgd_extraction_run_id: UUID


def _stable(key: str) -> UUID:
    return uuid5(INGESTION_NAMESPACE, key)


def stable_district_id(lgd_code: str) -> UUID:
    """Stable identifier for a district's feed observations."""
    return _stable(f"lgd_district:{lgd_code}")


def _fetch(url: str, *, method: str, body: bytes | None, timeout: float) -> tuple[bytes, str]:
    request = Request(url, data=body, method=method)
    if body is not None:
        request.add_header("Content-Type", "application/x-www-form-urlencoded")
    try:
        with urlopen(request, timeout=timeout) as response:
            status = response.status
            content_type = response.headers.get("Content-Type", "application/octet-stream")
            payload = response.read()
    except Exception as error:
        raise DistrictFeedError(f"fetch failed for {url}: {error}") from error
    if status != 200:
        raise DistrictFeedError(f"{url} returned HTTP {status}")
    return payload, content_type


def fetch_district_sources(timeout: float = 25.0) -> tuple[FeedSnapshot, FeedSnapshot]:
    """Fetch the live LGD and AP State Portal district feeds.

    LGD requires a POST with form field ``stateCode=28``; a GET returns the
    434 BAD_REQUEST error documented in the source registry.
    """
    now = datetime.now(UTC)
    lgd_payload, lgd_content_type = _fetch(
        LGD_DISTRICT_URL,
        method="POST",
        body=LGD_REQUEST_BODY.encode(),
        timeout=timeout,
    )
    ap_payload, ap_content_type = _fetch(AP_DISTRICT_URL, method="GET", body=None, timeout=timeout)
    return (
        FeedSnapshot(
            key="lgd-district-list",
            name="Local Government Directory district list",
            publisher="Local Government Directory (LGD)",
            url=LGD_DISTRICT_URL,
            public_url=LGD_PUBLIC_URL,
            request_method="POST",
            request_body=LGD_REQUEST_BODY,
            content_type=lgd_content_type,
            raw=lgd_payload,
            retrieved_at=now,
        ),
        FeedSnapshot(
            key="ap-portal-districts",
            name="Andhra Pradesh State Portal district directory",
            publisher="Andhra Pradesh State Portal",
            url=AP_DISTRICT_URL,
            public_url=AP_PORTAL_PUBLIC_URL,
            request_method="GET",
            request_body=None,
            content_type=ap_content_type,
            raw=ap_payload,
            retrieved_at=now,
        ),
    )


def parse_lgd_districts(raw: bytes) -> list[DistrictFeedRecord]:
    """Validate and normalise the LGD district-list JSON payload."""
    try:
        payload = json.loads(raw.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as error:
        raise DistrictFeedError("LGD response is not valid UTF-8 JSON") from error
    if not isinstance(payload, list) or not payload:
        raise DistrictFeedError("LGD response did not contain a district list")
    records: list[DistrictFeedRecord] = []
    for item in payload:
        if not isinstance(item, dict):
            raise DistrictFeedError("LGD district entry is not an object")
        code = item.get("districtCode")
        name_en = item.get("districtNameEnglish")
        name_local = item.get("districtNameLocal")
        if code is None or not isinstance(name_en, str) or not name_en:
            raise DistrictFeedError("LGD district entry is missing its English name or code")
        if not isinstance(name_local, str) or not name_local:
            raise DistrictFeedError("LGD district entry is missing its local name")
        records.append(
            DistrictFeedRecord(
                lgd_code=str(code),
                name_en=name_en.strip(),
                name_local=name_local.strip(),
            )
        )
    return records


def parse_ap_portal_codes(raw: bytes) -> dict[str, str]:
    """Extract ``{portal code: display name}`` from the AP State Portal feed."""
    try:
        payload = json.loads(raw.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as error:
        raise DistrictFeedError("AP portal response is not valid UTF-8 JSON") from error
    data_list = payload.get("dataList") if isinstance(payload, dict) else None
    if not isinstance(data_list, list) or not data_list:
        raise DistrictFeedError("AP portal response did not contain a district list")
    codes: dict[str, str] = {}
    for item in data_list:
        if not isinstance(item, dict):
            raise DistrictFeedError("AP portal district entry is not an object")
        code = item.get("code")
        name = item.get("name")
        if code is None or not isinstance(name, str) or not name:
            raise DistrictFeedError("AP portal district entry is missing its code or name")
        codes[str(code)] = name.strip()
    return codes


def _normalise(value: str) -> str:
    return "".join(character for character in value.casefold() if character.isalnum())


def attach_portal_codes(
    records: list[DistrictFeedRecord],
    portal_codes: dict[str, str],
) -> list[DistrictFeedRecord]:
    """Attach AP State Portal codes using the reviewed manifest mapping.

    The reviewed Stage 1 manifest maps every baseline district's LGD code to
    its AP portal code; the live portal name index fills the two districts the
    baseline deferred.
    """
    manifest = load_manifest()
    manifest_by_lgd = {item.lgd_code: item.ap_portal_code for item in manifest.districts}
    portal_by_name = {_normalise(name): code for code, name in portal_codes.items()}
    enriched: list[DistrictFeedRecord] = []
    for record in records:
        code = manifest_by_lgd.get(record.lgd_code)
        if code is None:
            code = portal_by_name.get(_normalise(record.name_en))
        enriched.append(record.model_copy(update={"ap_portal_code": code}))
    return enriched


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
            "request_body": snapshot.request_body,
            "adapter": "district-feed",
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
    store: SnapshotStore,
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
    key = snapshot_key(checksum, ".json")
    if not store.exists(key):
        store.put(key, snapshot.raw)
    stored = SourceSnapshot(
        id=_stable(f"ingestion-snapshot:{snapshot.key}:{checksum}"),
        document_id=document.id,
        retrieved_at=snapshot.retrieved_at,
        http_status=200,
        content_type=snapshot.content_type,
        file_size_bytes=len(snapshot.raw),
        sha256=checksum,
        object_storage_key=key,
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


def store_district_feed(
    session: Session,
    storage_dir: Path,
    lgd_snapshot: FeedSnapshot,
    ap_snapshot: FeedSnapshot,
    lgd_records: Sequence[DistrictFeedRecord],
    portal_codes: dict[str, str],
    *,
    software_revision: str = SOFTWARE_REVISION,
) -> FeedStoreResult:
    """Persist raw snapshots, extraction runs, and typed official observations."""
    retrieved_on = lgd_snapshot.retrieved_at.date()
    now = lgd_snapshot.retrieved_at
    run_ids: list[UUID] = []
    snapshots_stored = 0
    observations_created = 0
    lgd_sha256 = ""

    lgd_feed_rows = [
        (
            record.lgd_code,
            {
                "name_en": record.name_en,
                "name_local": record.name_local,
                "lgd_code": record.lgd_code,
                **({"ap_portal_code": record.ap_portal_code} if record.ap_portal_code else {}),
            },
        )
        for record in lgd_records
    ]
    ap_feed_rows = [(code, {"code": code, "name": name}) for code, name in portal_codes.items()]
    store = get_snapshot_store(storage_dir=storage_dir)

    for snapshot, entity_type, rows in (
        (lgd_snapshot, "lgd_district", lgd_feed_rows),
        (ap_snapshot, "ap_portal_district", ap_feed_rows),
    ):
        source = _ensure_source_record(session, snapshot, retrieved_on)
        document = _ensure_document(session, source, snapshot, retrieved_on)
        snapshot_row, stored = _store_snapshot(session, document, snapshot, store)
        snapshots_stored += int(stored)
        checksum = sha256(snapshot.raw).hexdigest()
        if entity_type == "lgd_district":
            lgd_sha256 = checksum
        run = _ensure_extraction_run(
            session,
            snapshot_row,
            adapter_name=f"{snapshot.key}-adapter",
            count=len(rows),
            now=now,
        )
        run_ids.append(run.id)
        observations_created += _write_observations(
            session,
            document=document,
            snapshot=snapshot_row,
            extraction_run=run,
            entity_type=entity_type,
            rows=rows,
            retrieved_on=retrieved_on,
        )
    session.flush()
    return FeedStoreResult(
        snapshots_stored=snapshots_stored,
        observations_created=observations_created,
        extraction_run_ids=tuple(run_ids),
        lgd_sha256=lgd_sha256,
        lgd_extraction_run_id=run_ids[0],
    )


def review_feed_observations(
    session: Session,
    *,
    extraction_run_ids: Sequence[UUID],
    reviewer_identity: str,
    decided_at: datetime,
) -> int:
    """Approve and publish every pending observation from the given runs."""
    pending = session.scalars(
        select(SourceObservation).where(
            SourceObservation.extraction_run_id.in_(tuple(extraction_run_ids)),
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
                    "District-feed extraction is deterministic and the values are "
                    "transcribed from the official API response."
                ),
                decided_at=decided_at,
            )
        )
        observation.review_state = ObservationReviewState.REVIEWED
        observation.is_published = True
    session.flush()
    return len(pending)


def _resolve_feed_provenance(
    session: Session,
    extraction_run_id: UUID,
) -> tuple[SourceDocument, SourceSnapshot, ExtractionRun]:
    run = session.get(ExtractionRun, extraction_run_id)
    if run is None:
        raise DistrictFeedError("the LGD extraction run is missing; store the feed first")
    snapshot = session.get(SourceSnapshot, run.snapshot_id)
    if snapshot is None:
        raise DistrictFeedError("the LGD snapshot is missing; store the feed first")
    document = session.get(SourceDocument, snapshot.document_id)
    if document is None:
        raise DistrictFeedError("the LGD document is missing; store the feed first")
    return document, snapshot, run


def _ensure_deferred_source(
    session: Session,
    *,
    slug: str,
    name_en: str,
    lgd_code: str,
    retrieval_date: date,
    snapshot_sha256: str,
) -> SourceReference:
    source_id = uuid5(SEED_NAMESPACE, f"source:district:{slug}")
    source = session.get(SourceReference, source_id)
    if source is not None:
        return source
    source = SourceReference(
        id=source_id,
        source_name=f"LGD district list and {name_en} official portal",
        official_source_url=LGD_DISTRICT_URL,
        retrieval_date=retrieval_date,
        publication_date=None,
        effective_date=None,
        review_status=ReviewStatus.REVIEWED,
        is_fixture=False,
        citation_metadata={
            "request_method": "POST",
            "request_body": LGD_REQUEST_BODY,
            "lgd_code": lgd_code,
            "snapshot_sha256": snapshot_sha256,
            "public_source_url": DEFERRED_DISTRICT_PUBLIC_URLS[slug],
        },
        notes=(
            "Published from the live LGD district feed after the Stage 1 baseline "
            "deliberately deferred this district; English name and LGD code carry provenance."
        ),
    )
    session.add(source)
    session.flush()
    return source


def _ensure_deferred_geography(
    session: Session,
    *,
    state: Geography,
    slug: str,
    name_en: str,
    name_te: str,
    lgd_code: str,
    valid_from: date,
    source: SourceReference,
) -> Geography:
    geography = session.scalar(select(Geography).where(Geography.slug == slug))
    if geography is not None:
        return geography
    geography = Geography(
        id=uuid5(SEED_NAMESPACE, f"geography:{slug}"),
        slug=slug,
        entity_type=GeographyType.DISTRICT,
        name_en=name_en,
        name_te=name_te,
        official_code=lgd_code,
        official_code_scheme="LGD district code",
        parent_id=state.id,
        valid_from=valid_from,
        valid_to=None,
        is_active=True,
        is_pilot=False,
        coverage_note=(
            "Boundary not reviewed; Telugu label is a provisional transliteration "
            "awaiting official district-portal confirmation."
        ),
        point=None,
        boundary=None,
        boundary_precision=None,
        boundary_valid_from=None,
        boundary_valid_to=None,
        boundary_source_id=None,
        source_id=source.id,
    )
    session.add(geography)
    session.flush()
    return geography


def _ensure_state_relationship(
    session: Session,
    *,
    state: Geography,
    district: Geography,
    valid_from: date,
    source: SourceReference,
) -> None:
    existing = session.scalar(
        select(GeographyRelationship).where(
            GeographyRelationship.from_geography_id == state.id,
            GeographyRelationship.to_geography_id == district.id,
            GeographyRelationship.relationship_type
            == GeographyRelationshipType.ADMINISTRATIVE_CONTAINS,
            GeographyRelationship.valid_from == valid_from,
        )
    )
    if existing is not None:
        return
    session.add(
        GeographyRelationship(
            id=uuid5(SEED_NAMESPACE, f"geography-relationship:{state.slug}:{district.slug}"),
            from_geography_id=state.id,
            to_geography_id=district.id,
            relationship_type=GeographyRelationshipType.ADMINISTRATIVE_CONTAINS,
            valid_from=valid_from,
            valid_to=None,
            source_id=source.id,
            relationship_metadata={"origin": "network-ingestion/district-feed"},
        )
    )


def _audit_geography_publication(
    session: Session,
    *,
    geography: Geography,
    reviewer_identity: str,
    decided_at: datetime,
    snapshot_sha256: str,
    document: SourceDocument,
    snapshot: SourceSnapshot,
    extraction_run: ExtractionRun,
) -> bool:
    observation_id = _stable(f"ingestion-geography-review:{geography.slug}")
    observation = session.get(SourceObservation, observation_id)
    if observation is not None:
        return False
    observation = SourceObservation(
        id=observation_id,
        entity_type="geography",
        entity_id=geography.id,
        field_path="reviewed_geography",
        value_json={
            "name_en": geography.name_en,
            "name_te": geography.name_te,
            "lgd_code": geography.official_code,
            "snapshot_sha256": snapshot_sha256,
        },
        document_id=document.id,
        snapshot_id=snapshot.id,
        extraction_run_id=extraction_run.id,
        classification=ValueClassification.OFFICIAL,
        review_state=ObservationReviewState.PENDING,
        valid_from=geography.valid_from,
        is_published=False,
    )
    session.add(observation)
    session.flush()
    session.add(
        ReviewDecision(
            id=_stable(f"ingestion-geography-review-decision:{geography.slug}"),
            observation_id=observation.id,
            reviewer_identity=reviewer_identity,
            decision=ReviewDecisionType.APPROVE,
            reason=(
                "Resolves the Stage 1 coverage caveat by publishing the district the "
                "live LGD feed records; raw response is stored in the district feed."
            ),
            decided_at=decided_at,
        )
    )
    observation.review_state = ObservationReviewState.REVIEWED
    observation.is_published = True
    session.flush()
    return True


def publish_deferred_districts(
    session: Session,
    *,
    reviewer_identity: str,
    decided_at: datetime,
    snapshot_sha256: str,
    lgd_extraction_run_id: UUID,
    valid_from: date,
) -> int:
    """Publish Markapuram and Polavaram with audited, provenance-linked review."""
    state = session.scalar(select(Geography).where(Geography.slug == "andhra-pradesh"))
    if state is None:
        raise DistrictFeedError("the andhra-pradesh state geography has not been seeded")
    document, snapshot, extraction_run = _resolve_feed_provenance(session, lgd_extraction_run_id)
    published = 0
    for item in DEFERRED_DISTRICTS:
        source = _ensure_deferred_source(
            session,
            slug=item["slug"],
            name_en=item["name_en"],
            lgd_code=item["lgd_code"],
            retrieval_date=decided_at.date(),
            snapshot_sha256=snapshot_sha256,
        )
        geography = _ensure_deferred_geography(
            session,
            state=state,
            slug=item["slug"],
            name_en=item["name_en"],
            name_te=item["name_te"],
            lgd_code=item["lgd_code"],
            valid_from=valid_from,
            source=source,
        )
        _ensure_state_relationship(
            session,
            state=state,
            district=geography,
            valid_from=valid_from,
            source=source,
        )
        published += int(
            _audit_geography_publication(
                session,
                geography=geography,
                reviewer_identity=reviewer_identity,
                decided_at=decided_at,
                snapshot_sha256=snapshot_sha256,
                document=document,
                snapshot=snapshot,
                extraction_run=extraction_run,
            )
        )
    session.flush()
    return published
