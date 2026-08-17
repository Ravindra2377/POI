"""Read-only network ingestion for the official AP Legislative Assembly member report.

The operator-facing command fetches the Andhra Pradesh Legislature website's
assembly member report (a Liferay portlet) for a chosen Assembly term (14th,
15th, or 16th), stores the raw HTML response as an immutable snapshot,
extracts typed official observations for each Member of the Legislative
Assembly (MLA), and publishes reviewed claims with source provenance. Nothing
here runs in a production request path; every run is an explicit, audited
operator action.

The term choice is carried as a Liferay render parameter in the URL, so a
plain GET returns the report for the requested term. The site rate-limits
repeated portlet submissions by returning a short "Page Not Found" page with
HTTP 200, so the fetcher retries such responses with a short backoff.

Known source limitations (recorded in the source registry and surfaced in the
web model): the member report is published in English only, so every Telugu
field remains empty and unpublished. The report groups members by the 13
pre-reorganisation Andhra Pradesh districts (plus a "NOMINATED" section in the
14th term); it does not carry constituency-level district boundaries or
personal member biographies.

Source stability note (2026-08-16): the Legislature site also exposes a PDF
export of the report, but on that date it switched to a template whose columns
wrap across lines in an ambiguous, layout-dependent way that cannot be parsed
reliably; the HTML portlet report remains the stable, validated source.
"""

import html
import re
import time
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
from app.storage import SnapshotStore, get_snapshot_store, snapshot_key

OFFICEHOLDER_INGESTION_NAMESPACE = UUID("e8f3b1c2-3d4e-5f6a-7b8c-9d0e1f2a3b4c")
ADAPTER_VERSION = "1.0.0"
SOFTWARE_REVISION = "officeholder-feed-1.1.0"

# Verified live endpoint and human-readable page (2026-08-16). The report is a
# Liferay portlet; the term choice is a render parameter in the URL.
AP_LEGISLATURE_REPORT_URL = (
    "https://aplegislature.org/web/legislative-assembly/legislative-assembly/"
    "member-s-information"
)
AP_LEGISLATURE_PUBLIC_URL = "https://aplegislature.org"
AP_LEGISLATURE_PORTLET_INSTANCE = "AssemblyMemberInformation_APPortlet_INSTANCE_u0YprwIEdWmS"

# Ordinal word used by the report header for each Assembly term.
ASSEMBLY_TERMS: dict[int, tuple[str, str]] = {
    16: ("Term XVI", "SIXTEENTH"),
    15: ("Term XV", "FIFTEENTH"),
    14: ("Term XIV", "FOURTEENTH"),
}
DEFAULT_TERM_ID = 16

OFFICE_TITLE_EN = "Member of Legislative Assembly"
GOVERNMENT_BODY_EN = "Andhra Pradesh Legislative Assembly"

_TERM_HEADER_RE = re.compile(
    r"(FOURTEENTH|FIFTEENTH|SIXTEENTH) ANDHRA PRADESH LEGISLATIVE ASSEMBLY "
    r"CONSTITUTED ON (\d{2}\.\d{2}\.\d{4})"
)
_TABLE_RE = re.compile(r'<ul class="table1">(.*?)</ul>', re.IGNORECASE | re.DOTALL)
_DISTRICT_H4_RE = re.compile(r"<h4[^>]*>")
_DISTRICT_NAME_RE = re.compile(r"\s*([A-Z][A-Z ]*?)\s*(?=</h4>)")
_MEMBER_SPLIT_RE = re.compile(r'<li><div class="data">', re.IGNORECASE)
_MEMBER_NAME_RE = re.compile(
    r'class="cbp-vm-title mem_name"[^>]*>(.*?)</font>', re.IGNORECASE | re.DOTALL
)
_MEMBER_IMG_ALT_RE = re.compile(r'<img[^>]*alt="([^"]+)"', re.IGNORECASE)
_CONSTITUENCY_RE = re.compile(
    r'class="cbp-vm-price const_name"[^>]*>(.*?)</div>', re.IGNORECASE | re.DOTALL
)
_PARTY_RE = re.compile(
    r'class="cbp-vm-icon cbp-vm-add"[^>]*>(.*?)</div>', re.IGNORECASE | re.DOTALL
)
_MEMBER_ID_RE = re.compile(r"mem_id=(\d+)")
_CONSTITUENCY_PREFIX_RE = re.compile(r"^\d+\.\s*")


class OfficeholderFeedError(RuntimeError):
    """Raised when the AP Legislative Assembly member report cannot be processed."""


class OfficeholderFeedRecord(BaseModel):
    slug: str
    term_id: int
    person_name_en: str
    person_name_te: str = ""
    office_title_en: str = OFFICE_TITLE_EN
    office_title_te: str = ""
    government_body_en: str = GOVERNMENT_BODY_EN
    government_body_te: str = ""
    district_en: str
    district_te: str = ""
    constituency_en: str
    constituency_te: str = ""
    term_period_en: str
    term_period_te: str = ""
    party_en: str = ""
    party_te: str = ""
    constituted_on: str = ""
    member_id: str = ""


@dataclass(frozen=True)
class FeedSnapshot:
    """Metadata plus raw bytes for one fetched official report."""

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
    """Counts and identifiers from an officeholder-feed store run."""

    snapshots_stored: int
    observations_created: int
    extraction_run_id: UUID
    sha256: str


def _stable(key: str) -> UUID:
    return uuid5(OFFICEHOLDER_INGESTION_NAMESPACE, key)


def _slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.casefold()).strip("-")
    return slug or "unknown"


def build_officeholders_report_url(term_id: int) -> str:
    """Build the portlet render URL that selects a specific Assembly term.

    The term choice is a Liferay render parameter, so a plain GET returns the
    report for the requested term without a form POST.
    """
    _validate_term_id(term_id)
    return (
        f"{AP_LEGISLATURE_REPORT_URL}?p_p_id={AP_LEGISLATURE_PORTLET_INSTANCE}"
        "&p_p_lifecycle=0&p_p_state=normal&p_p_mode=view"
        f"&_{AP_LEGISLATURE_PORTLET_INSTANCE}_term_id={term_id}"
    )


def _validate_term_id(term_id: int) -> None:
    if term_id not in ASSEMBLY_TERMS:
        raise OfficeholderFeedError(
            f"term_id {term_id} is not supported; expected one of {sorted(ASSEMBLY_TERMS)}"
        )


def _looks_like_rate_limit_response(payload: bytes) -> bool:
    """True when the response is the site's rate-limit "Page Not Found" page.

    The Legislature site responds to repeated portlet requests with an HTTP
    200 page of a few hundred bytes reading "Page Not Found". A genuine report
    is hundreds of kilobytes, so a short body is treated as a retryable
    failure.
    """
    return not payload or len(payload) < 4096 or b"Page Not Found" in payload


def fetch_ap_officeholders(
    term_id: int = DEFAULT_TERM_ID,
    timeout: float = 25.0,
    max_attempts: int = 3,
) -> FeedSnapshot:
    """Fetch the live AP Legislative Assembly member report for one term.

    The Legislature site rate-limits repeated portlet submissions by returning
    a short HTTP 200 "Page Not Found" page, so such responses are retried with
    a short backoff before giving up.
    """
    _validate_term_id(term_id)
    url = build_officeholders_report_url(term_id)
    last_error: Exception | None = None
    status: int | None = None
    payload = b""
    content_type = "text/html"
    for attempt in range(max_attempts):
        try:
            request = Request(url, method="GET")
            with urlopen(request, timeout=timeout) as response:
                status = response.status
                content_type = response.headers.get("Content-Type", "text/html")
                payload = response.read()
            if status == 200 and not _looks_like_rate_limit_response(payload):
                last_error = None
                break
            last_error = OfficeholderFeedError(
                f"{url} returned HTTP {status} with a short or rate-limited body"
            )
        except Exception as error:  # noqa: BLE001 - surfaced after retries
            last_error = error
        if attempt + 1 < max_attempts:
            time.sleep(5 * (attempt + 1))
    if last_error is not None:
        raise OfficeholderFeedError(f"fetch failed for {url}: {last_error}") from last_error
    label, _ordinal = ASSEMBLY_TERMS[term_id]
    return FeedSnapshot(
        key=f"ap-legislature-officeholders-term{term_id}",
        name=f"AP Legislative Assembly member report ({label})",
        publisher="Andhra Pradesh Legislature Secretariat",
        url=url,
        public_url=AP_LEGISLATURE_PUBLIC_URL,
        request_method="GET",
        request_body=None,
        content_type=content_type,
        raw=payload,
        retrieved_at=datetime.now(UTC),
    )


def _strip_tags(fragment: str) -> str:
    return html.unescape(re.sub(r"<[^>]+>", " ", fragment))


def _collapse(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def _parse_term_header(raw: bytes, term_id: int) -> str:
    """Return the constituted date from the report header for the requested term."""
    try:
        text = raw.decode("utf-8")
    except UnicodeDecodeError as error:
        raise OfficeholderFeedError("member report is not valid UTF-8 text") from error
    match = _TERM_HEADER_RE.search(text)
    if match is None:
        raise OfficeholderFeedError(
            "member report did not contain an Assembly term header; "
            "the source structure may have changed"
        )
    ordinal, constituted_on = match.groups()
    expected = ASSEMBLY_TERMS[term_id][1]
    if ordinal != expected:
        raise OfficeholderFeedError(
            f"requested term {expected} but the report describes the {ordinal} Assembly; "
            "the term selector may have changed"
        )
    return constituted_on


def parse_officeholders(raw: bytes, *, term_id: int) -> list[OfficeholderFeedRecord]:
    """Validate and normalise the HTML member report for one Assembly term."""
    _validate_term_id(term_id)
    constituted_on = _parse_term_header(raw, term_id)
    text = raw.decode("utf-8", errors="replace")
    table = _TABLE_RE.search(text)
    if table is None:
        raise OfficeholderFeedError("member report did not contain the member table")
    body = table.group(1)

    label, _ordinal = ASSEMBLY_TERMS[term_id]
    records: list[OfficeholderFeedRecord] = []
    for segment in _DISTRICT_H4_RE.split(body)[1:]:
        district_match = _DISTRICT_NAME_RE.match(segment)
        district = _collapse(district_match.group(1)) if district_match else ""
        for member_block in _MEMBER_SPLIT_RE.split(segment)[1:]:
            name_match = _MEMBER_NAME_RE.search(member_block)
            name = _collapse(_strip_tags(name_match.group(1))) if name_match else ""
            if not name:
                alt_match = _MEMBER_IMG_ALT_RE.search(member_block)
                name = _collapse(alt_match.group(1)) if alt_match else ""
            constituency_match = _CONSTITUENCY_RE.search(member_block)
            constituency = (
                _collapse(_strip_tags(constituency_match.group(1)))
                if constituency_match
                else ""
            )
            constituency = _CONSTITUENCY_PREFIX_RE.sub("", constituency)
            party_match = _PARTY_RE.search(member_block)
            party = _collapse(_strip_tags(party_match.group(1))) if party_match else ""
            member_id_match = _MEMBER_ID_RE.search(member_block)
            member_id = member_id_match.group(1) if member_id_match else ""
            if not name or not constituency:
                raise OfficeholderFeedError(
                    "a member block was missing its name or constituency; "
                    "the source structure may have changed"
                )
            constituency_slug = _slugify(constituency)
            records.append(
                OfficeholderFeedRecord(
                    slug=f"term{term_id}-{member_id}-{constituency_slug}",
                    term_id=term_id,
                    person_name_en=name,
                    district_en=district,
                    constituency_en=constituency,
                    term_period_en=f"{label} (constituted {constituted_on})",
                    party_en=party,
                    constituted_on=constituted_on,
                    member_id=member_id,
                )
            )
    if not records:
        raise OfficeholderFeedError("member report contained no members")
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
        official_domain=urlsplit(snapshot.url).hostname or "aplegislature.org",
        source_type="web_page",
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
    constituted_on: str,
) -> SourceDocument:
    document_id = _stable(f"ingestion-document:{snapshot.key}")
    document = session.get(SourceDocument, document_id)
    if document is not None:
        return document
    constituted_date: date | None = None
    if constituted_on:
        try:
            constituted_date = datetime.strptime(constituted_on, "%d.%m.%Y").date()
        except ValueError:
            constituted_date = None
    document = SourceDocument(
        id=document_id,
        source_id=source.id,
        official_url=snapshot.url,
        title=snapshot.name,
        publication_date=None,
        reporting_period_start=constituted_date,
        reporting_period_end=None,
        document_type="web_page",
        language_code=LanguageCode.EN,
        jurisdiction_code="IN-AP",
        document_metadata={
            "request_method": snapshot.request_method,
            "adapter": "officeholder-feed",
            "request_body": snapshot.request_body,
            **({"constituted_on": constituted_on} if constituted_on else {}),
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
        },
    )
    session.add(stored)
    session.flush()
    return stored, True


def _ensure_extraction_run(
    session: Session,
    snapshot: SourceSnapshot,
    *,
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


def _write_observations(
    session: Session,
    *,
    document: SourceDocument,
    snapshot: SourceSnapshot,
    extraction_run: ExtractionRun,
    rows: Sequence[tuple[str, dict[str, str]]],
    retrieved_on: date,
) -> int:
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


def store_officeholders_feed(
    session: Session,
    storage_dir: Path,
    snapshot: FeedSnapshot,
    records: Sequence[OfficeholderFeedRecord],
) -> FeedStoreResult:
    """Persist the raw snapshot, extraction run, and typed official observations."""
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
                "constituency_en": record.constituency_en,
                "constituency_te": record.constituency_te,
                "term_period_en": record.term_period_en,
                "term_period_te": record.term_period_te,
                "party_en": record.party_en,
                "party_te": record.party_te,
            },
        )
        for record in records
    ]
    constituted_on = records[0].constituted_on if records else ""
    source = _ensure_source_record(session, snapshot, retrieved_on)
    document = _ensure_document(session, source, snapshot, retrieved_on, constituted_on)
    store = get_snapshot_store(storage_dir=storage_dir)
    snapshot_row, stored = _store_snapshot(session, document, snapshot, store)
    run = _ensure_extraction_run(
        session,
        snapshot_row,
        count=len(rows),
        now=snapshot.retrieved_at,
    )
    observations_created = _write_observations(
        session,
        document=document,
        snapshot=snapshot_row,
        extraction_run=run,
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


def review_officeholders_observations(
    session: Session,
    *,
    extraction_run_id: UUID,
    reviewer_identity: str,
    decided_at: datetime,
) -> int:
    """Approve and publish every pending observation from the officeholder run."""
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
                    "Officeholder extraction is deterministic and the values are "
                    "transcribed from the official AP Legislative Assembly member "
                    "report. Telugu fields are absent from the English-only source "
                    "and are intentionally left unpublished."
                ),
                decided_at=decided_at,
            )
        )
        observation.review_state = ObservationReviewState.REVIEWED
        observation.is_published = True
    session.flush()
    return len(pending)
