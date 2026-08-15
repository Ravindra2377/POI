"""Read-only network ingestion for the AP Finance Annual Financial Statement.

The operator-facing command crawls the AP Finance budget page for the
Annual Financial Statement (Volume-I-1) of every budget year, stores each raw
PDF as an immutable snapshot, extracts typed official observations for the
major-head rows of every statement, reviews and publishes them. Nothing here
runs in a production request path; every run is an explicit, audited operator
action.

Known source limitations (recorded in the source registry and surfaced in the
web model): the AFS carries amounts in rupees and the same Telugu/English head
names, but attributes no department, district, or beneficiary to a major head.
Those fields therefore remain unpublished observations; the catalogue reports
them as not published rather than fabricating values.
"""

import re
from collections import Counter, defaultdict
from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from datetime import UTC, date, datetime
from decimal import Decimal
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

BUDGET_INGESTION_NAMESPACE = UUID("8d1f9c2a-4b6e-4d0a-9f3c-7e2a5d8b1c4a")
ADAPTER_VERSION = "1.0.0"
SOFTWARE_REVISION = "ap-afs-1.0.0"

# Verified live pages (2026-08-15).
BUDGET_MANIFEST_URL = "https://apfinance.gov.in/budget.html"

# Major-head code ranges that identify a substantive revenue head rather than a
# total/subtotal or a control code. Revenue heads use 0xxx codes; expenditure
# and capital heads use 2xxx-9xxx. We keep every 4-digit code that carries a
# value and is not a subtotal row; totals are excluded by name below.
VALUE_TOKEN = re.compile(r"\-?[0-9][0-9,]*(?:\.[0-9]+)?")
UNIT_FACTORS = {"thousands": 1000, "lakhs": 100000, "crores": 10000000}

# A row that introduces a major head: an optional Telugu prefix, a 4-digit
# code, and usually the English head name on the same line. Some years place
# the code on a line of its own with the values and continue the name on the
# surrounding lines, so the name is optional here; a bare code row is still a
# row start.
MAJOR_HEAD_ROW = re.compile(
    r"(?:^|\s)([0-9]{4})(?:\s+([A-Z][A-Za-z .,()/&\'’\-]*))?(?:\s|$)"
)


def _first_value_position(text: str) -> int | None:
    """Return the index where a numeric value token begins in ``text``.

    A continuation line like ``Central Taxes  849,68.00`` mixes a name
    fragment and a value; this finds the start of the value so the caller can
    split the two. Returns None when the line carries no value.
    """
    match = VALUE_TOKEN.search(text)
    return match.start() if match else None


def _is_bare_code_row(text: str) -> bool:
    """True when ``text`` is a major-head code row with no inline name."""
    match = MAJOR_HEAD_ROW.search(text)
    return bool(match and not match.group(2))


_ASCII_LETTERS = re.compile(r"[A-Za-z0-9 .,()/&\'’\-]+")


def _join_name(current: str, fragment: str) -> str:
    """Append a continuation ``fragment`` to a head ``current`` name.

    Strips Telugu script from the fragment (the source interleaves the Telugu
    and English names) and joins hyphen-wrapped words like ``Co-`` +
    ``operation`` without a stray space.
    """
    fragment = fragment.strip()
    if not fragment:
        return current
    kept = "".join(_ASCII_LETTERS.findall(fragment)).strip()
    if not kept:
        return current
    if current.endswith("-"):
        return current + kept.lstrip()
    return (current + " " + kept).strip()

STATEMENT_HEADERS = {
    "A": "revenue_receipts",
    "B": "capital_receipts",
    "C": "public_account_receipts",
    "D": "revenue_expenditure",
    "E": "capital_expenditure",
    "F": "public_debt_disbursements",
    "G": "public_account_disbursements",
}

TOTAL_NAMES = ("Total", "Grand", "Accounts Receipts")

# Lines that end a major head rather than continuing it: subtotals, section
# markers, statement headers, and bare page numbers.
SECTION_MARKER = re.compile(r"^\s*(?:\([a-zA-Z]\)|[a-zA-Z]|\b[A-Za-z]{1,2}\b)\s{2,}[A-Za-z]")
SECTION_HEADER = re.compile(r"Capital Account of|Statement of")
# A standalone section letter line like ``A`` or ``(b)`` in a wrapped layout.
STANDALONE_SECTION = re.compile(r"^\s*(?:\([a-zA-Z]\)|[a-zA-Z])\s*$")
# A statement/section letter row like ``E      Public Debt`` or
# ``F      Loans and Advances`` (a letter, two or more spaces, then a title).
SECTION_LETTER_ROW = re.compile(r"(?:^|\s)(?:\([a-zA-Z]\)|[a-zA-Z])\s{2,}[A-Za-z]")


class BudgetFeedError(RuntimeError):
    """Raised when the AP Finance feed cannot be fetched or parsed."""


class BudgetYearRecord(BaseModel):
    """One budget year's AFS download details discovered from the manifest."""

    fiscal_year: str
    url: str


@dataclass(frozen=True)
class BudgetLine:
    """One parsed major-head row within an AFS statement."""

    fiscal_year: str
    statement: str
    code: str
    name_en: str
    unit: str
    unit_factor: int
    values: tuple[str, ...]
    rupees: tuple[Decimal, ...]


@dataclass(frozen=True)
class BudgetSnapshot:
    """Metadata plus raw bytes for one fetched official AFS PDF."""

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
class BudgetStoreResult:
    """Counts and identifiers from a budget store run."""

    snapshots_stored: int
    observations_created: int
    extraction_run_id: UUID
    sha256: str


def _stable(key: str) -> UUID:
    return uuid5(BUDGET_INGESTION_NAMESPACE, key)


def parse_afs_manifest(html: str) -> list[BudgetYearRecord]:
    """Extract one Annual Financial Statement PDF URL per budget year."""
    years: list[BudgetYearRecord] = []
    for match in re.finditer(r'href="([^"]+)"', html):
        url = match.group(1)
        if "Volume-I-1" not in url:
            continue
        if "Bud@et" in url:
            year_match = re.search(r"Bud@et(\d{2})-(\d{2})", url)
            if not year_match:
                continue
            fiscal_year = f"20{year_match.group(1)}-20{year_match.group(2)}"
        else:
            year_match = re.search(r"budget-volumes/(\d{4})-(\d{2})/", url)
            if not year_match:
                continue
            fiscal_year = f"{year_match.group(1)}-20{year_match.group(2)}"
        if not any(record.fiscal_year == fiscal_year for record in years):
            years.append(BudgetYearRecord(fiscal_year=fiscal_year, url=url))
    return sorted(years, key=lambda record: record.fiscal_year)


def fetch_afs_manifest(*, timeout: float = 25.0) -> str:
    """Fetch the raw AP Finance budget manifest page."""
    request = Request(BUDGET_MANIFEST_URL, method="GET")
    status = 0
    payload = b""
    try:
        with urlopen(request, timeout=timeout) as response:
            status = response.status
            payload = response.read()
    except Exception as error:
        raise BudgetFeedError(
            f"fetch failed for {BUDGET_MANIFEST_URL}: {error}"
        ) from error
    if status != 200:
        raise BudgetFeedError(f"{BUDGET_MANIFEST_URL} returned HTTP {status}")
    decoded = bytes(payload).decode("utf-8", errors="replace")
    return decoded


def _unit_factor(unit_text: str) -> int | None:
    lowered = unit_text.lower()
    for name, factor in UNIT_FACTORS.items():
        if name in lowered:
            return factor
    return None


def _normalise_value(token: str, factor: int) -> Decimal:
    return Decimal(token.replace(",", "")) * factor


def _classify_statement(text: str) -> str | None:
    """Return the statement key for a header line, or None."""
    for letter, key in STATEMENT_HEADERS.items():
        if f"{letter}." in text and "Statement" in text:
            return key
    if "Statement" in text:
        if "Revenue" in text and "Expenditure" not in text:
            return "revenue_receipts"
        if "Capital" in text and "Expenditure" not in text:
            return "capital_receipts"
    return None


def parse_afs_layout(
    layout_text: str,
    *,
    fiscal_year: str,
) -> list[BudgetLine]:
    """Parse the ``pdftotext -layout`` output of an AFS Volume-I-1 PDF."""
    lines = layout_text.splitlines()
    rows: list[BudgetLine] = []
    current_unit: str | None = None
    current_factor: int | None = None
    current_statement: str | None = None
    pending_code: str | None = None
    pending_name = ""
    pending_line_tail = ""
    pending_pre_name = ""

    def flush_pending() -> None:
        nonlocal pending_code, pending_name, pending_line_tail, pending_pre_name
        if pending_code is None or current_factor is None:
            pending_code = None
            pending_name = ""
            pending_line_tail = ""
            pending_pre_name = ""
            return
        name = re.sub(r"\s+", " ", pending_name).strip()
        # Layout noise splices commas around wrapped fragments (", Loans for
        # Water Supply and", "Cash Remittances and , adjustments"); collapse
        # them into a single separator and trim stray leading/trailing commas.
        name = re.sub(r"\s*,(\s*,)+\s*", ", ", name).strip(" ,")
        if name.startswith(TOTAL_NAMES):
            pending_code = None
            pending_name = ""
            pending_line_tail = ""
            pending_pre_name = ""
            return
        values = re.findall(VALUE_TOKEN, pending_line_tail)
        if not values:
            pending_code = None
            pending_name = ""
            pending_line_tail = ""
            pending_pre_name = ""
            return
        # A major head row carries at most four columns (Accounts/Budget/
        # Revised/Budget, or legacy Non-Plan/Plan/Total with blank cells).
        # Rows with many tokens are narrative prose that wrapped into the tail.
        if len(values) > 6:
            pending_code = None
            pending_name = ""
            pending_line_tail = ""
            pending_pre_name = ""
            return
        rupees = tuple(_normalise_value(token, current_factor) for token in values)
        rows.append(
            BudgetLine(
                fiscal_year=fiscal_year,
                statement=current_statement or "unclassified",
                code=pending_code,
                name_en=name,
                unit=current_unit or "",
                unit_factor=current_factor,
                values=tuple(values),
                rupees=rupees,
            )
        )
        pending_code = None
        pending_name = ""
        pending_line_tail = ""
        pending_pre_name = ""

    def _next_nonempty(index: int) -> str:
        """The next non-empty line after ``lines[index]`` (or ``""``)."""
        for following in lines[index + 1:]:
            if following.strip():
                return following
        return ""

    def _next_code_or_value(index: int) -> str:
        """The next line after ``lines[index]`` that is a code row or carries a
        value, skipping intervening name-only continuation lines but stopping at
        section boundaries."""
        for following in lines[index + 1:]:
            stripped = following.strip()
            if not stripped:
                continue
            if "Rupees in" in following or "Statement" in following:
                continue
            if SECTION_HEADER.search(following):
                return following
            if MAJOR_HEAD_ROW.search(following):
                return following
            if _first_value_position(stripped) is not None:
                return following
        return ""

    for index, line in enumerate(lines):
        unit_match = re.search(r"Rupees in ([A-Za-z]+)", line)
        if unit_match:
            factor = _unit_factor(unit_match.group(1))
            if factor is not None:
                current_unit = unit_match.group(1)
                current_factor = factor
        statement = _classify_statement(line)
        if statement is not None:
            current_statement = statement

        stripped = line.strip()
        # Stop the pending row at subtotals, section markers and page numbers.
        if (
            pending_code is not None
            and stripped
            and (
                "Total" in stripped
                or SECTION_MARKER.match(line)
                or re.fullmatch(r"[0-9]{1,3}", stripped)
            )
        ):
            flush_pending()
            continue

        row_match = MAJOR_HEAD_ROW.search(line)
        if row_match:
            pre_name = pending_pre_name
            flush_pending()
            inline_name = (row_match.group(2) or "").strip()
            combined_name = _join_name(pre_name, inline_name)
            pending_code = row_match.group(1)
            pending_name = combined_name
            pending_line_tail = line[row_match.end():]
            continue
        if pending_code is not None:
            # A continuation line may extend the head name or carry values.
            if not stripped:
                continue
            if "Rupees in" in line or "Statement" in line:
                continue
            # Split the continuation into its leading name text (if any) and
            # any trailing value tokens.
            value_start = _first_value_position(stripped)
            if value_start is not None:
                name_part = stripped[:value_start].strip()
                if name_part:
                    pending_name = _join_name(pending_name, name_part)
                pending_line_tail += " " + stripped[value_start:].strip()
                continue
        if not stripped or "Rupees in" in line or "Statement" in line:
            continue
        # Section header fragments must not leak into head names: reset the
        # wrapped-name buffer at section boundaries.
        if (
            SECTION_HEADER.search(stripped)
            or STANDALONE_SECTION.match(stripped)
            or SECTION_LETTER_ROW.search(stripped)
        ):
            pending_pre_name = ""
            continue
        # A name-only line is the wrapped prefix of the *next* head when the next
        # code-bearing line is a bare code row (the name wraps around a code
        # placed on its own line); otherwise, when a row is pending it
        # continues the current head's name.
        following = _next_code_or_value(index)
        if _is_bare_code_row(following):
            pending_pre_name = _join_name(pending_pre_name, stripped)
        elif pending_code is not None:
            pending_name = _join_name(pending_name, stripped)
    flush_pending()
    return rows


def _head_name_garbled(name: str) -> bool:
    """True when a head name is missing or shows the wrapped-name merge
    artifact (two head names spliced together)."""
    if not name:
        return True
    head_tokens = (
        "capital outlay",
        "loans and advances",
        "internal debt",
        "loans for",
    )
    lowered = name.lower()
    return any(lowered.count(token) > 1 for token in head_tokens)


def canonical_head_names(
    rows_by_year: Sequence[Sequence[BudgetLine]],
) -> dict[tuple[str, str], str]:
    """Return the canonical English name for each (statement, code).

    Major-head codes and their official names are stable across budget years,
    so the most frequent *clean* name observed in the corpus is authoritative.
    Among near-tied names the longest one wins, which prefers the complete
    wrapped name over a truncated fragment. Names that never parse cleanly in
    any year are omitted so callers keep the raw extraction.
    """
    counts: dict[tuple[str, str], Counter[str]] = defaultdict(Counter)
    for rows in rows_by_year:
        for line in rows:
            counts[(line.statement, line.code)][line.name_en] += 1
    canonical: dict[tuple[str, str], str] = {}
    for key, counter in counts.items():
        clean_items = [
            (name, count) for name, count in counter.items() if not _head_name_garbled(name)
        ]
        if not clean_items:
            continue
        max_count = max(count for _, count in clean_items)
        near_leading = [
            name
            for name, count in clean_items
            if count >= max(1, max_count - 1)
        ]
        canonical[key] = max(near_leading, key=len)
    return canonical


def reconcile_head_names(
    lines: Sequence[BudgetLine],
    canonical: Mapping[tuple[str, str], str],
) -> list[BudgetLine]:
    """Replace empty or garbled head names with the corpus-canonical name."""
    reconciled: list[BudgetLine] = []
    for line in lines:
        if not _head_name_garbled(line.name_en):
            reconciled.append(line)
            continue
        name = canonical.get((line.statement, line.code), line.name_en)
        if _head_name_garbled(name):
            reconciled.append(line)
            continue
        reconciled.append(
            BudgetLine(
                fiscal_year=line.fiscal_year,
                statement=line.statement,
                code=line.code,
                name_en=name,
                unit=line.unit,
                unit_factor=line.unit_factor,
                values=line.values,
                rupees=line.rupees,
            )
        )
    return reconciled


def fetch_afs_pdf(
    year: BudgetYearRecord,
    *,
    timeout: float = 120.0,
    headers: dict[str, str] | None = None,
) -> BudgetSnapshot:
    """Fetch the AFS PDF for one budget year."""
    request = Request(year.url, method="GET")
    for key, value in (headers or {}).items():
        request.add_header(key, value)
    try:
        with urlopen(request, timeout=timeout) as response:
            status = response.status
            content_type = response.headers.get(
                "Content-Type", "application/octet-stream"
            )
            payload = response.read()
    except Exception as error:
        raise BudgetFeedError(f"fetch failed for {year.url}: {error}") from error
    if status != 200:
        raise BudgetFeedError(f"{year.url} returned HTTP {status}")
    return BudgetSnapshot(
        key=f"ap-afs-{year.fiscal_year}",
        name=f"Annual Financial Statement {year.fiscal_year} (Volume-I-1)",
        publisher="Government of Andhra Pradesh Finance Department",
        url=year.url,
        public_url="https://apfinance.gov.in/budget.html",
        request_method="GET",
        request_body=None,
        content_type=content_type,
        raw=payload,
        retrieved_at=datetime.now(UTC),
    )


def _ensure_source_record(
    session: Session, snapshot: BudgetSnapshot, retrieved_on: date
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
        source_type="annual_financial_statement",
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
    snapshot: BudgetSnapshot,
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
        document_type="annual_financial_statement",
        language_code=LanguageCode.EN,
        jurisdiction_code="IN-AP",
        document_metadata={
            "request_method": snapshot.request_method,
            "adapter": "ap-afs",
            "public_source_url": snapshot.public_url or "",
        },
    )
    session.add(document)
    session.flush()
    return document


def _store_snapshot(
    session: Session,
    document: SourceDocument,
    snapshot: BudgetSnapshot,
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
        parser_configuration={"adapter": "ap-afs", "statement_column_detection": True},
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
    rows: Sequence[tuple[str, dict[str, str | Decimal | None]]],
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
            value_number = value if isinstance(value, Decimal) else None
            value_text = (
                None
                if isinstance(value, Decimal)
                else str(value)
                if value is not None
                else None
            )
            session.add(
                SourceObservation(
                    id=observation_id,
                    entity_type=entity_type,
                    entity_id=entity_id,
                    field_path=field_path,
                    value_text=value_text,
                    value_number=value_number,
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


def store_budget_afs(
    session: Session,
    storage_dir: Path,
    snapshot: BudgetSnapshot,
    lines: Sequence[BudgetLine],
    *,
    software_revision: str = SOFTWARE_REVISION,
) -> BudgetStoreResult:
    """Persist the raw snapshot, extraction run, and typed official observations."""
    retrieved_on = snapshot.retrieved_at.date()
    rows: list[tuple[str, dict[str, str | Decimal | None]]] = []
    for line in lines:
        slug = (
            f"{line.fiscal_year}-{line.statement}-{line.code}-"
            f"{re.sub(r'[^a-z0-9]+', '-', line.name_en.lower()).strip('-')}"
        )
        fields: dict[str, str | Decimal | None] = {
            "slug": slug,
            "fiscal_year": line.fiscal_year,
            "statement": line.statement,
            "code": line.code,
            "name_en": line.name_en,
            "unit": line.unit,
        }
        for index, (token, rupees) in enumerate(
            zip(line.values, line.rupees, strict=False)
        ):
            fields[f"value_{index + 1}"] = rupees
            fields[f"value_{index + 1}_text"] = token
        if line.rupees:
            fields["amount"] = line.rupees[-1]
            fields["amount_text"] = line.values[-1]
        rows.append((slug, fields))
    source = _ensure_source_record(session, snapshot, retrieved_on)
    document = _ensure_document(session, source, snapshot, retrieved_on)
    snapshot_row, stored = _store_snapshot(session, document, snapshot, storage_dir)
    run = _ensure_extraction_run(
        session,
        snapshot_row,
        adapter_name="ap-afs-adapter",
        count=len(rows),
        now=snapshot.retrieved_at,
    )
    observations_created = _write_observations(
        session,
        document=document,
        snapshot=snapshot_row,
        extraction_run=run,
        entity_type="budget_line",
        rows=rows,
        retrieved_on=retrieved_on,
    )
    session.flush()
    return BudgetStoreResult(
        snapshots_stored=int(stored),
        observations_created=observations_created,
        extraction_run_id=run.id,
        sha256=sha256(snapshot.raw).hexdigest(),
    )


def review_budget_observations(
    session: Session,
    *,
    extraction_run_id: UUID,
    reviewer_identity: str,
    decided_at: datetime,
) -> int:
    """Approve and publish every pending observation from the AFS run."""
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
                    "AFS extraction is deterministic and the values are "
                    "transcribed from the official Annual Financial Statement "
                    "PDF. Department, district, and beneficiary fields are "
                    "absent from the source and intentionally unpublished."
                ),
                decided_at=decided_at,
            )
        )
        observation.review_state = ObservationReviewState.REVIEWED
        observation.is_published = True
    session.flush()
    return len(pending)