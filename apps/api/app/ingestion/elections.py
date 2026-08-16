"""Read-only PDF ingestion for official AP Legislative Assembly election results.

The operator-facing command ingests the Andhra Pradesh Legislature's official
district-wise member reports for the 14th, 15th, and 16th Assembly terms as
PDF documents. Each report lists the members elected in the corresponding
general election — constituency number, constituency name (with SC/ST
reservation where applicable), member name, and party affiliation — and
records subsequent changes to a seat: by-elections, deaths, disqualifications,
and resignations.

The pipeline converts each PDF to ``pdftotext -layout`` text, parses the
wrapped, annotated rows (including by-election rows such as ``2A`` whose seat
is sometimes printed on the following line or inherited from the row above),
and publishes reviewed official observations with full source provenance.
Nothing here runs in a production request path; every run is an explicit,
audited operator action.

Known source limitations (recorded in the source registry and surfaced in the
web model): the reports are published in English only, so every Telugu field
remains empty and unpublished. The report groups members by the 13
pre-reorganisation Andhra Pradesh districts (plus a "NOMINATED" section in the
14th term whose rows carry placeholder ``---`` entries and are not transcribed
because they contain no member name). One Term XVI row (Kovur) omits the
constituency number in the source; its constituency and party are still
published with an empty constituency number. The 14th-term report is for the
post-reorganisation Andhra Pradesh only and its report header gives the
constituted year without a day or month.

Source stability note (2026-08-16): the Legislature website's live PDF export
now uses a layout-unstable template that cannot be parsed reliably, so this
pipeline ingests operator-supplied official PDF files (the committed term
report PDFs are genuine publications) rather than fetching the live export.
"""

import re
import subprocess
import tempfile
from collections.abc import Sequence
from dataclasses import dataclass
from datetime import UTC, date, datetime
from hashlib import sha256
from pathlib import Path
from typing import TypedDict
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

ELECTION_INGESTION_NAMESPACE = UUID("5b6f4a1e-8c2d-4f7a-9e1b-3d5a7c9e2f1a")
ADAPTER_VERSION = "1.0.0"
SOFTWARE_REVISION = "election-results-1.0.0"

# The member reports are published under the official AP Legislature domain.
AP_LEGISLATURE_PUBLIC_URL = "https://aplegislature.org"
AP_LEGISLATURE_MEMBERS_PAGE = (
    "https://aplegislature.org/web/legislative-assembly/legislative-assembly/"
    "member-s-information"
)

# Ordinal word used by each term's PDF header.
ELECTION_RESULTS_TERMS: dict[int, tuple[str, str]] = {
    16: ("Term XVI", "SIXTEENTH"),
    15: ("Term XV", "FIFTEENTH"),
    14: ("Term XIV", "FOURTEENTH"),
}

_ORDINAL_RE = re.compile(
    r"(FOURTEENTH|FIFTEENTH|SIXTEENTH)\s+ANDHRA PRADESH LEGISLATIVE\s+ASSEMBLY"
)
_CONSTITUTED_RE = re.compile(
    r"CONSTITUTED ON\s+((?:\d{1,2}(?:th|nd|rd|st)?\s*[A-Za-z]+\s*[,\s]*)?\d{4})",
    re.IGNORECASE,
)
_DISTRICT_RE = re.compile(r"^\s*\d+\s*[–-]\s+([A-Z][A-Z ]*?)\s*$")
_FULL_ROW_RE = re.compile(
    r"^\s*(\d+[A-Za-z]?)\s*\.?\s+(\S.*?)\s{2,}(\d+)\s{2,}(\S.*?)\s{2,}(\S+)\s*$"
)
_ROW_NO_CONST_RE = re.compile(r"^\s*(\d+[A-Za-z]?)\s*\.?\s+(\S.*?)\s{4,}(\S+)\s*$")
_BYE_NO_SL_RE = re.compile(
    r"^\s*(?:Smt|Sri|Dr|Kum|Prof|Mohd|Master|Miss|Messrs|Thirumathi|Thirumati|Thrimathi)"
    r"\.?\s+(.+?)\s{2,}(\d+)\s{2,}(\S.*?)\s*$"
)
_SL_ONLY_RE = re.compile(r"^\s*(\d+[A-Za-z]?)\s*$")
_SL_PARTY_RE = re.compile(r"^\s*(\d+[A-Za-z]?)\s{2,}(\S+)\s*$")
_CONST_LINE_RE = re.compile(r"^\s*(\d+)\s{2,}(\S.*?)\s*$")
_TRAILING_CONST_RE = re.compile(r"(\d+)\s{2,}(\S.*?)\s*$")
_WIDE_GAP_RE = re.compile(r"\s{4,}")
_RESERVED_RE = re.compile(r"\((SC|ST)\)\s*$")

_MONTHS = {
    "january": 1,
    "february": 2,
    "march": 3,
    "april": 4,
    "may": 5,
    "june": 6,
    "july": 7,
    "august": 8,
    "september": 9,
    "october": 10,
    "november": 11,
    "december": 12,
}


class ElectionFeedError(RuntimeError):
    """Raised when the AP Legislative Assembly member report cannot be processed."""


class ElectionResultFeedRecord(BaseModel):
    slug: str
    term_id: int
    term_period_en: str
    constituted_on: str = ""
    district_en: str
    member_sl_no: str
    member_name_en: str
    constituency_no: str = ""
    constituency_en: str
    reserved_category: str = ""
    party_en: str = ""
    elected_via: str = "general_election"
    seat_status: str = ""
    annotation_en: str = ""
    inherited_seat: bool = False


@dataclass(frozen=True)
class ElectionFeedSnapshot:
    """Metadata plus raw PDF bytes for one official member report."""

    key: str
    name: str
    publisher: str
    url: str
    public_url: str
    request_method: str
    request_body: str | None
    content_type: str
    raw: bytes
    retrieved_at: datetime
    file_name: str


@dataclass(frozen=True)
class ElectionFeedStoreResult:
    """Counts and identifiers from an election-results feed store run."""

    snapshots_stored: int
    observations_created: int
    extraction_run_id: UUID
    sha256: str


def _stable(key: str) -> UUID:
    return uuid5(ELECTION_INGESTION_NAMESPACE, key)


def _slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.casefold()).strip("-")
    return slug or "unknown"


def _normalise(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def _is_annotation_continuation(s: str) -> bool:
    t = s.lstrip(" .)\t")
    if not t or t.startswith("("):
        return True
    return t.startswith(
        (
            "of ",
            "Oath",
            "held",
            "accepted",
            "Disqual",
            "supreme",
            "Supreme",
            "and",
            "on ",
            "in ",
            "Bye",
            "bye",
            "by-",
        )
    )


def _parse_term(text: str) -> tuple[int, str]:
    """Return (term_id, constituted string) from the report header."""
    header = text[:1200]
    ordinal_match = _ORDINAL_RE.search(header)
    if ordinal_match is None:
        raise ElectionFeedError(
            "member report did not contain an Assembly term header; "
            "the source structure may have changed"
        )
    ordinal = ordinal_match.group(1)
    term_id = next(tid for tid, (_label, word) in ELECTION_RESULTS_TERMS.items() if word == ordinal)
    constituted_match = _CONSTITUTED_RE.search(header)
    constituted = _normalise(constituted_match.group(1)) if constituted_match else ""
    return term_id, constituted


def _normalise_constituted(constituted: str) -> str:
    """Normalise '06TH JUNE, 2024' to '06.06.2024'; leave '2014' as-is."""
    match = re.fullmatch(
        r"(\d{1,2})(?:th|nd|rd|st)?\s+([A-Za-z]+)[,\s]*\s*(\d{4})",
        constituted,
        flags=re.IGNORECASE,
    )
    if match is None:
        return constituted
    day, month, year = match.groups()
    month_number = _MONTHS.get(month.casefold())
    if month_number is None:
        return constituted
    return f"{int(day):02d}.{month_number:02d}.{year}"


class _MemberState(TypedDict):
    sl: str
    name: str
    const_no: str
    constituency: str
    reserved: str
    party: str
    district: str
    seat_status: str
    annotation: str
    inherited: bool


def _finalise(members: list[_MemberState], current: _MemberState) -> None:
    annotation = current.get("annotation", "")
    name = _normalise(current["name"])
    if "(" in name:
        cut = name.index("(")
        annotation = (name[cut:] + " " + annotation).strip()
        name = name[:cut].rstrip()
    party = _normalise(current.get("party", ""))
    constituency = _normalise(current.get("constituency", ""))
    if not name or "---" in name or name.replace("-", "").strip() == "":
        return
    reserved = ""
    reserved_match = _RESERVED_RE.search(constituency)
    if reserved_match:
        reserved = reserved_match.group(1)
    ann = annotation.lower()
    if "died" in ann:
        seat_status = "died"
    elif "resign" in ann:
        seat_status = "resigned"
    elif "disqualif" in ann:
        seat_status = "disqualified"
    elif "bye-election" in ann or "bye election" in ann or "oath on" in ann:
        seat_status = "bye_election"
    else:
        seat_status = ""
    members.append(
        {
            "sl": current["sl"],
            "name": name,
            "const_no": current.get("const_no", ""),
            "constituency": constituency,
            "reserved": reserved,
            "party": party,
            "district": current.get("district", ""),
            "seat_status": seat_status,
            "annotation": annotation,
            "inherited": current.get("inherited", False),
        }
    )


def parse_election_results(
    text: str, *, term_id: int | None = None
) -> list[ElectionResultFeedRecord]:
    """Validate and normalise the ``pdftotext -layout`` member report for one term.

    When ``term_id`` is omitted, the term is detected from the report header.
    """
    detected_term, constituted = _parse_term(text)
    if term_id is None:
        term_id = detected_term
    if term_id not in ELECTION_RESULTS_TERMS:
        raise ElectionFeedError(
            f"term_id {term_id} is not supported; expected one of {sorted(ELECTION_RESULTS_TERMS)}"
        )
    if term_id != detected_term:
        raise ElectionFeedError(
            f"requested term {term_id} but the report describes the {detected_term} Assembly; "
            "the report may have been mislabeled"
        )
    label, _ordinal = ELECTION_RESULTS_TERMS[term_id]
    constituted_on = _normalise_constituted(constituted)
    term_period = f"{label} (constituted {constituted_on})"

    members: list[_MemberState] = []
    current: _MemberState | None = None
    district = ""

    def close() -> None:
        nonlocal current
        if current is not None:
            _finalise(members, current)
            current = None

    in_footer = False
    for raw in text.splitlines():
        s = raw.strip()
        if not s:
            continue
        if s.startswith("-@"):
            close()
            in_footer = True
            continue
        if in_footer:
            continue
        if (
            "Name of the Member" in s
            or s.startswith("Sl.")
            or s.startswith("N0.")
            or "Affilia" in s
            or s in ("No.", "No", "t.", "Cons", "Const.", "N0.")
        ):
            close()
            continue
        if "NOMINATED" in s:
            close()
            district = "NOMINATED"
            continue
        district_match = _DISTRICT_RE.match(raw)
        if district_match:
            close()
            district = _normalise(district_match.group(1))
            continue

        sl_only = _SL_ONLY_RE.match(raw)
        if sl_only and current is not None and not current.get("sl"):
            current["sl"] = sl_only.group(1)
            continue

        sl_party = _SL_PARTY_RE.match(raw)
        if (
            sl_party
            and current is not None
            and current.get("const_no")
            and current.get("constituency")
        ):
            if not current.get("sl"):
                current["sl"] = sl_party.group(1)
            if not current.get("party"):
                current["party"] = sl_party.group(2)
            continue

        full = _FULL_ROW_RE.match(raw)
        if full:
            sl, name, const_no, constituency, party = full.groups()
            close()
            current = {
                "sl": sl,
                "name": name,
                "const_no": const_no,
                "constituency": constituency,
                "reserved": "",
                "party": party,
                "district": district,
                "seat_status": "",
                "annotation": "",
                "inherited": False,
            }
            continue

        bye_no_sl = _BYE_NO_SL_RE.match(raw)
        if bye_no_sl:
            name, const_no, constituency = bye_no_sl.groups()
            close()
            current = {
                "sl": "",
                "name": name,
                "const_no": const_no,
                "constituency": constituency,
                "reserved": "",
                "party": "",
                "district": district,
                "seat_status": "",
                "annotation": "",
                "inherited": False,
            }
            continue

        row_no_const = _ROW_NO_CONST_RE.match(raw)
        if row_no_const:
            sl, name_part, party = row_no_const.groups()
            close()
            # A row that omits its constituency number can still carry the
            # constituency name between the member name and the party column
            # (e.g. the Term XVI Kovur row); pull it out of the wide gap.
            constituency_hint = ""
            segments = _WIDE_GAP_RE.split(name_part)
            if len(segments) > 1:
                name_part = segments[0]
                constituency_hint = _normalise(" ".join(segments[1:]))
            current = {
                "sl": sl,
                "name": name_part,
                "const_no": "",
                "constituency": constituency_hint,
                "reserved": "",
                "party": party,
                "district": district,
                "seat_status": "",
                "annotation": "",
                "inherited": False,
            }
            continue

        if current is not None and _is_annotation_continuation(s):
            annotation = s.lstrip(" .)\t")
            current["annotation"] = (current["annotation"] + " " + annotation).strip()
            trailing = _TRAILING_CONST_RE.search(raw)
            if trailing and not current["const_no"]:
                current["const_no"] = trailing.group(1)
                current["constituency"] = _normalise(trailing.group(2))
            continue

        if current is not None and (not current["const_no"] or not current["constituency"]):
            const_line = _CONST_LINE_RE.match(raw)
            if const_line:
                current["const_no"] = const_line.group(1)
                current["constituency"] = _normalise(const_line.group(2))
                continue

        if current is not None:
            current["name"] = current["name"] + " " + s

    close()

    # By-election rows whose seat was not printed inherit it from the original
    # row (sl "2A" follows sl "2", etc.).
    for i, member in enumerate(members):
        if member["const_no"] or member["constituency"]:
            continue
        if member["sl"].endswith("A") and member["sl"][:-1].isdigit():
            base = member["sl"][:-1]
            for previous in reversed(members[:i]):
                if previous["sl"] == base and previous["const_no"]:
                    member["const_no"] = previous["const_no"]
                    member["constituency"] = previous["constituency"]
                    member["inherited"] = True
                    break
    # Original rows whose seat was printed only on the by-election row inherit
    # it from that row (sl "1" followed by sl "1A").
    for i, member in enumerate(members):
        if member["const_no"] or member["constituency"]:
            continue
        if member["sl"].isdigit() and i + 1 < len(members):
            following = members[i + 1]
            if following["sl"] == member["sl"] + "A" and following["const_no"]:
                member["const_no"] = following["const_no"]
                member["constituency"] = following["constituency"]
                member["inherited"] = True

    records: list[ElectionResultFeedRecord] = []
    for member in members:
        constituency_slug = _slugify(member["constituency"])
        if member["const_no"]:
            slug = f"term{term_id}-{member['const_no']}-{constituency_slug}"
        else:
            slug = f"term{term_id}-{constituency_slug}"
        if member["seat_status"] == "bye_election":
            slug = f"{slug}-bye-election"
        records.append(
            ElectionResultFeedRecord(
                slug=slug,
                term_id=term_id,
                term_period_en=term_period,
                constituted_on=constituted_on,
                district_en=member["district"],
                member_sl_no=member["sl"],
                member_name_en=member["name"],
                constituency_no=member["const_no"],
                constituency_en=member["constituency"],
                reserved_category=member["reserved"],
                party_en=member["party"],
                elected_via=(
                    "bye_election" if member["seat_status"] == "bye_election"
                    else "general_election"
                ),
                seat_status=member["seat_status"],
                annotation_en=member["annotation"],
                inherited_seat=member["inherited"],
            )
        )
    if not records:
        raise ElectionFeedError("member report contained no members")
    return records


def _pdf_to_text(pdf: bytes) -> str:
    """Convert member-report PDF bytes to ``pdftotext -layout`` text."""
    with tempfile.TemporaryDirectory() as directory:
        pdf_path = Path(directory) / "report.pdf"
        text_path = Path(directory) / "report.txt"
        pdf_path.write_bytes(pdf)
        try:
            subprocess.run(
                ["pdftotext", "-layout", str(pdf_path), str(text_path)],
                check=True,
                capture_output=True,
            )
        except (subprocess.CalledProcessError, FileNotFoundError) as error:
            raise ElectionFeedError(
                "pdftotext -layout failed for the member report; is poppler-utils installed?"
            ) from error
        return text_path.read_text(encoding="utf-8", errors="replace")


def build_election_snapshot(
    pdf: bytes,
    *,
    term_id: int,
    file_name: str,
) -> ElectionFeedSnapshot:
    """Build a feed snapshot from an operator-supplied official member-report PDF."""
    if term_id not in ELECTION_RESULTS_TERMS:
        raise ElectionFeedError(
            f"term_id {term_id} is not supported; expected one of {sorted(ELECTION_RESULTS_TERMS)}"
        )
    label, _ordinal = ELECTION_RESULTS_TERMS[term_id]
    return ElectionFeedSnapshot(
        key=f"ap-legislature-election-results-term{term_id}",
        name=f"AP Legislative Assembly member report ({label})",
        publisher="Andhra Pradesh Legislature Secretariat",
        url=AP_LEGISLATURE_MEMBERS_PAGE,
        public_url=AP_LEGISLATURE_PUBLIC_URL,
        request_method="local_file",
        request_body=file_name,
        content_type="application/pdf",
        raw=pdf,
        retrieved_at=datetime.now(UTC),
        file_name=file_name,
    )


def _ensure_source_record(
    session: Session, snapshot: ElectionFeedSnapshot, retrieved_on: date
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
        source_type="election_result_report",
        jurisdiction_code="IN-AP",
        access_method=AccessMethod.PDF,
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
    snapshot: ElectionFeedSnapshot,
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
        document_type="election_result_report",
        language_code=LanguageCode.EN,
        jurisdiction_code="IN-AP",
        document_metadata={
            "request_method": snapshot.request_method,
            "adapter": "election-results",
            "file_name": snapshot.file_name,
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
    snapshot: ElectionFeedSnapshot,
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
    target = snapshot_dir / f"{checksum}.pdf"
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
        object_storage_key=f"snapshots/{checksum}.pdf",
        retrieval_metadata={
            "url": snapshot.url,
            "request_method": snapshot.request_method,
            "file_name": snapshot.file_name,
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
        adapter_name="ap-legislature-elections-adapter",
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
        entity_id = _stable(f"election-result:{entity_key}")
        for field_path, value in fields.items():
            observation_id = _stable(
                f"ingestion-observation:election-result:{entity_key}:{field_path}"
            )
            if session.get(SourceObservation, observation_id) is not None:
                continue
            session.add(
                SourceObservation(
                    id=observation_id,
                    entity_type="election_result",
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


def store_election_results(
    session: Session,
    storage_dir: Path,
    snapshot: ElectionFeedSnapshot,
    records: Sequence[ElectionResultFeedRecord],
) -> ElectionFeedStoreResult:
    """Persist the raw PDF snapshot, extraction run, and typed official observations."""
    retrieved_on = snapshot.retrieved_at.date()
    rows = [
        (
            record.slug,
            {
                "slug": record.slug,
                "term_id": str(record.term_id),
                "term_period_en": record.term_period_en,
                "district_en": record.district_en,
                "member_sl_no": record.member_sl_no,
                "member_name_en": record.member_name_en,
                "constituency_no": record.constituency_no,
                "constituency_en": record.constituency_en,
                "reserved_category": record.reserved_category,
                "party_en": record.party_en,
                "elected_via": record.elected_via,
                "seat_status": record.seat_status,
                "annotation_en": record.annotation_en,
            },
        )
        for record in records
    ]
    constituted_on = records[0].constituted_on if records else ""
    source = _ensure_source_record(session, snapshot, retrieved_on)
    document = _ensure_document(session, source, snapshot, retrieved_on, constituted_on)
    snapshot_row, stored = _store_snapshot(session, document, snapshot, storage_dir)
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
    return ElectionFeedStoreResult(
        snapshots_stored=int(stored),
        observations_created=observations_created,
        extraction_run_id=run.id,
        sha256=sha256(snapshot.raw).hexdigest(),
    )


def review_election_observations(
    session: Session,
    *,
    extraction_run_id: UUID,
    reviewer_identity: str,
    decided_at: datetime,
) -> int:
    """Approve and publish every pending observation from the election-results run."""
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
                    "Election-result extraction is deterministic and the values are "
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
