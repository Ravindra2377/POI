"""Read-only network ingestion for the MoSPI Infrastructure Performance Monitoring dashboard.

The operator-facing command fetches the MoSPI IPM public dashboard page
(https://ipm.mospi.gov.in/Home/PublicDashboard), stores the raw HTML response
as an immutable snapshot, extracts typed official observations for every State
and UT (approved cost, revised cost, cumulative expenditure, and project count),
reviews and publishes them. Nothing here runs in a production request path;
every run is an explicit, audited operator action.

Known source limitations (recorded in the source registry and surfaced in the
web model): the dashboard reports State/UT and sector aggregates in INR crore
and does not publish project-level detail, so no project-level observation is
inferred from these totals. MoSPI's certificate chain fails public validation,
so transport encryption is still used but the certificate is not verified; the
snapshot's sha256 is recorded in the database so the stored bytes remain
verifiable after retrieval.
"""

import json
import re
import ssl
from collections.abc import Sequence
from dataclasses import dataclass
from datetime import UTC, date, datetime
from decimal import Decimal
from hashlib import sha256
from pathlib import Path
from urllib.parse import urlsplit
from urllib.request import Request, urlopen
from uuid import UUID, uuid5

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.enums import (
    AccessMethod,
    ExtractionStatus,
    GeographyType,
    LanguageCode,
    ObservationReviewState,
    ReviewDecisionType,
    ReviewStatus,
    ValueClassification,
)
from app.models.geography import Geography
from app.models.provenance import (
    ExtractionRun,
    ReviewDecision,
    SourceDocument,
    SourceObservation,
    SourceRecord,
    SourceSnapshot,
)
from app.storage import SnapshotStore, get_snapshot_store, snapshot_key

IPM_INGESTION_NAMESPACE = UUID("0f4a2b8c-3d5e-4f6a-9b1c-7e8d2a3b4c5d")
ADAPTER_VERSION = "1.0.0"
SOFTWARE_REVISION = "mospi-ipm-1.0.0"

# Verified live page (2026-08-18).
IPM_DASHBOARD_URL = "https://ipm.mospi.gov.in/Home/PublicDashboard"
IPM_PUBLIC_URL = "https://ipm.mospi.gov.in/Home/PublicDashboard"
IPM_USER_AGENT = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120"

# The latest displayed freeze is the authoritative dashboard data cut; verified
# via /Home/GetFreezeDates (2026-08-18): firstFreeze 2025-07, lastFreeze 2026-04.
DEFAULT_MONTH_YEAR = "2026-04"

# MoSPI StateId -> platform ISO-3166-2:IN code, verified against
# /Home/GetStateList (2026-08-18). The MoSPI StateId is not the LGD state code.
MOSPI_STATE_IDS: dict[int, str] = {
    47: "IN-AN",
    1: "IN-AP",
    2: "IN-AR",
    3: "IN-AS",
    4: "IN-BR",
    48: "IN-CH",
    5: "IN-CT",
    43: "IN-DH",
    32: "IN-DL",
    6: "IN-GA",
    31: "IN-GJ",
    7: "IN-HR",
    8: "IN-HP",
    9: "IN-JK",
    10: "IN-JH",
    11: "IN-KA",
    12: "IN-KL",
    42: "IN-LA",
    41: "IN-LD",
    13: "IN-MP",
    34: "IN-MH",
    14: "IN-MN",
    15: "IN-ML",
    16: "IN-MZ",
    17: "IN-NL",
    18: "IN-OR",
    44: "IN-PY",
    19: "IN-PB",
    33: "IN-RJ",
    20: "IN-SK",
    21: "IN-TN",
    24: "IN-TG",
    22: "IN-TR",
    37: "IN-UP",
    23: "IN-UT",
    36: "IN-WB",
}


class IpmFeedError(RuntimeError):
    pass


@dataclass(frozen=True)
class IpmStateRow:
    """One State/UT aggregate row from the dashboard ``RevisedData`` array."""

    state_id: int
    state_name: str
    total_projects: int
    approved_cost_crores: Decimal
    revised_cost_crores: Decimal
    cumulative_expenditure_crores: Decimal


@dataclass(frozen=True)
class IpmSnapshot:
    """Metadata plus raw bytes for one fetched dashboard response."""

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
    month_year: str


@dataclass(frozen=True)
class IpmStoreResult:
    """Counts and identifiers from an IPM dashboard store run."""

    snapshots_stored: int
    observations_created: int
    extraction_run_id: UUID
    sha256: str
    states_covered: int


def _stable(key: str) -> UUID:
    return uuid5(IPM_INGESTION_NAMESPACE, key)


def _unverified_ssl_context() -> ssl.SSLContext:
    """Return an SSL context that does not verify the MoSPI certificate chain.

    MoSPI's public certificate chain fails standard validation, so the page is
    unreachable with default verification. Transport encryption is still used;
    the snapshot sha256 is recorded in the database and is the integrity check.
    """
    context = ssl.create_default_context()
    context.check_hostname = False
    context.verify_mode = ssl.CERT_NONE
    return context


def fetch_ipm_dashboard(
    month_year: str = DEFAULT_MONTH_YEAR,
    *,
    timeout: float = 90.0,
    headers: dict[str, str] | None = None,
) -> IpmSnapshot:
    """Fetch the IPM dashboard HTML for the given ``MonthYear`` freeze.

    The first GET returns the anti-forgery token; the subsequent POST with the
    same token returns the full server-rendered dashboard page embedding the
    ``RevisedData`` (State/UT aggregate) array. Fetching with ``StateId`` empty
    returns every State/UT row in a single response.
    """
    base_headers = {
        "User-Agent": IPM_USER_AGENT,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    }
    base_headers.update(headers or {})
    context = _unverified_ssl_context()

    try:
        token_request = Request(IPM_DASHBOARD_URL, headers=base_headers)
        with urlopen(token_request, timeout=timeout, context=context) as token_response:
            page = token_response.read().decode("utf-8", errors="replace")
        token_match = re.search(
            r'__RequestVerificationToken[^>]*value="([^"]+)"', page
        )
        if token_match is None:
            raise IpmFeedError("__RequestVerificationToken not found in dashboard page")
        token = token_match.group(1)

        body = "&".join(
            f"{key}={value}"
            for key, value in {
                "__RequestVerificationToken": token,
                "SectorId": "",
                "PROJ_MINISTRY_ID": "",
                "StateId": "",
                "CostRange": "",
                "MonthYear": month_year,
            }.items()
        )
        post_headers = {
            **base_headers,
            "Content-Type": "application/x-www-form-urlencoded",
            "X-Requested-With": "XMLHttpRequest",
            "Referer": IPM_DASHBOARD_URL,
        }
        post_request = Request(
            IPM_DASHBOARD_URL,
            data=body.encode("utf-8"),
            headers=post_headers,
            method="POST",
        )
        with urlopen(post_request, timeout=timeout, context=context) as response:
            status = response.status
            content_type = response.headers.get("Content-Type", "text/html")
            payload = response.read()
    except IpmFeedError:
        raise
    except Exception as error:
        raise IpmFeedError(f"IPM dashboard fetch failed: {error}") from error
    if status != 200:
        raise IpmFeedError(f"IPM dashboard returned HTTP {status}")

    return IpmSnapshot(
        key=f"mospi-ipm-{month_year}",
        name=f"MoSPI Infrastructure Performance Monitoring dashboard ({month_year})",
        publisher="Ministry of Statistics and Programme Implementation (MoSPI)",
        url=IPM_DASHBOARD_URL,
        public_url=IPM_PUBLIC_URL,
        request_method="POST",
        request_body=body,
        content_type=content_type,
        raw=payload,
        retrieved_at=datetime.now(UTC),
        month_year=month_year,
    )


def parse_ipm_dashboard(html: str) -> list[IpmStateRow]:
    """Extract the ``RevisedData`` array (State/UT aggregates) from dashboard HTML.

    Raises ``IpmFeedError`` when the array is absent or a row cannot be decoded,
    so a broken dashboard page never silently yields an empty catalogue.
    """
    match = re.search(r"var\s+RevisedData\s*=\s*(\[.*?\])", html, re.S)
    if match is None:
        raise IpmFeedError("RevisedData array not found in dashboard HTML")
    try:
        rows = json.loads(match.group(1))
    except json.JSONDecodeError as error:
        raise IpmFeedError(f"RevisedData is not valid JSON: {error}") from error

    parsed: list[IpmStateRow] = []
    for row in rows:
        if not isinstance(row, dict):
            raise IpmFeedError(f"RevisedData row is not an object: {row!r}")
        try:
            parsed.append(
                IpmStateRow(
                    state_id=int(row["StateId"]),
                    state_name=str(row["StateName"]),
                    total_projects=int(row["TotalProject"]),
                    approved_cost_crores=Decimal(str(row["CumCost"])),
                    revised_cost_crores=Decimal(str(row["CumRevCost"])),
                    cumulative_expenditure_crores=Decimal(str(row["CumExpen"])),
                )
            )
        except (KeyError, TypeError, ValueError) as error:
            raise IpmFeedError(f"RevisedData row is malformed: {row!r}") from error
    return parsed


def _resolve_state_geography(
    session: Session, iso_code: str
) -> Geography | None:
    """Resolve the platform state geography for an ISO code by its slug."""
    slug = "andhra-pradesh" if iso_code == "IN-AP" else iso_code.lower()
    return session.scalar(
        select(Geography).where(
            Geography.slug == slug,
            Geography.entity_type == GeographyType.STATE,
        )
    )


def _ensure_source_record(
    session: Session, snapshot: IpmSnapshot, retrieved_on: date
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
        source_type="infrastructure_performance_monitoring",
        jurisdiction_code="IN",
        access_method=AccessMethod.DASHBOARD,
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
    snapshot: IpmSnapshot,
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
        reporting_period_start=None,
        reporting_period_end=None,
        document_type="infrastructure_performance_monitoring",
        language_code=LanguageCode.EN,
        jurisdiction_code="IN",
        document_metadata={
            "request_method": snapshot.request_method,
            "adapter": "mospi-ipm",
            "month_year": snapshot.month_year,
            "public_source_url": snapshot.public_url or "",
            "note": (
                "MoSPI IPM reports State/UT and sector aggregates in INR crore; "
                "project-level detail is not published by the dashboard."
            ),
        },
    )
    session.add(document)
    session.flush()
    return document


def _store_snapshot(
    session: Session,
    document: SourceDocument,
    snapshot: IpmSnapshot,
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
    key = snapshot_key(checksum, ".html")
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
            "tls_verified": False,
            "month_year": snapshot.month_year,
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
        parser_configuration={"adapter": "mospi-ipm", "array": "RevisedData"},
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
    rows: Sequence[tuple[Geography, dict[str, str | Decimal | int | None]]],
    retrieved_on: date,
) -> int:
    created = 0
    for geography, fields in rows:
        entity_id = geography.id
        for field_path, value in fields.items():
            observation_id = _stable(
                f"ingestion-observation:{document.id}:{entity_id}:{field_path}"
            )
            if session.get(SourceObservation, observation_id) is not None:
                continue
            value_number = value if isinstance(value, Decimal | int) else None
            value_text = (
                None
                if value_number is not None
                else str(value)
                if value is not None
                else None
            )
            session.add(
                SourceObservation(
                    id=observation_id,
                    entity_type=GeographyType.STATE.value,
                    entity_id=entity_id,
                    geography_id=geography.id,
                    field_path=field_path,
                    value_text=value_text,
                    value_number=value_number,
                    unit="INR crore" if field_path.endswith("_crores") else None,
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


def store_ipm_dashboard(
    session: Session,
    storage_dir: Path,
    snapshot: IpmSnapshot,
    rows: Sequence[IpmStateRow],
    *,
    software_revision: str = SOFTWARE_REVISION,
) -> IpmStoreResult:
    """Persist the raw snapshot, extraction run, and typed official observations."""
    retrieved_on = snapshot.retrieved_at.date()
    prepared: list[tuple[Geography, dict[str, str | Decimal | int | None]]] = []
    states_covered = 0
    for row in rows:
        iso_code = MOSPI_STATE_IDS.get(row.state_id)
        if iso_code is None:
            continue
        geography = _resolve_state_geography(session, iso_code)
        if geography is None:
            continue
        prepared.append(
            (
                geography,
                {
                    "project_count": row.total_projects,
                    "approved_cost_crores": row.approved_cost_crores,
                    "revised_cost_crores": row.revised_cost_crores,
                    "cumulative_expenditure_crores": row.cumulative_expenditure_crores,
                },
            )
        )
        states_covered += 1

    source = _ensure_source_record(session, snapshot, retrieved_on)
    document = _ensure_document(session, source, snapshot, retrieved_on)
    store = get_snapshot_store(storage_dir=storage_dir)
    snapshot_row, stored = _store_snapshot(session, document, snapshot, store)
    run = _ensure_extraction_run(
        session,
        snapshot_row,
        adapter_name="mospi-ipm-dashboard",
        count=len(prepared),
        now=snapshot.retrieved_at,
    )
    observations_created = _write_observations(
        session,
        document=document,
        snapshot=snapshot_row,
        extraction_run=run,
        rows=prepared,
        retrieved_on=retrieved_on,
    )
    session.flush()
    return IpmStoreResult(
        snapshots_stored=int(stored),
        observations_created=observations_created,
        extraction_run_id=run.id,
        sha256=sha256(snapshot.raw).hexdigest(),
        states_covered=states_covered,
    )


def review_ipm_observations(
    session: Session,
    *,
    extraction_run_id: UUID,
    reviewer_identity: str,
    decided_at: datetime,
) -> int:
    """Approve and publish every pending observation from the IPM run."""
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
                    "IPM dashboard extraction is deterministic and the values are "
                    "transcribed from the official MoSPI dashboard response. The "
                    "dashboard reports State/UT aggregates in INR crore; no "
                    "project-level detail is published."
                ),
                decided_at=decided_at,
            )
        )
        observation.review_state = ObservationReviewState.REVIEWED
        observation.is_published = True
    session.flush()
    return len(pending)