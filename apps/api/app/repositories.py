from dataclasses import dataclass
from datetime import date
from decimal import Decimal
from math import ceil
from typing import Protocol, TypeVar
from uuid import UUID

from sqlalchemy import Select, func, or_, select
from sqlalchemy.orm import InstrumentedAttribute, Session, selectinload
from sqlalchemy.sql.elements import ColumnElement

from app.models.comparison import ClaimRecordComparison
from app.models.enums import GeographyType, GovernmentBodyType, ReviewStatus
from app.models.geography import Geography, GeographyAlias
from app.models.government import (
    Department,
    GovernmentBody,
    GovernmentBodyAlias,
    PublicOffice,
    PublicOfficeAlias,
    Representative,
)
from app.models.provenance import (
    ExtractionRun,
    ReviewDecision,
    SourceDocument,
    SourceObservation,
    SourceRecord,
    SourceSnapshot,
)
from app.models.source import SourceReference
from app.schemas.budget import (
    BudgetAmountOut,
    BudgetCatalogOut,
    BudgetClaimOut,
    BudgetLineOut,
    BudgetSourceOut,
)
from app.schemas.common import AliasSummary, PageMeta, ProvenanceSummary
from app.schemas.comparisons import (
    ClaimRecordComparisonOut,
    ComparisonCatalogOut,
    ComparisonObservationOut,
)
from app.schemas.elections import (
    ElectionResultCatalogOut,
    ElectionResultClaimOut,
    ElectionResultRecordOut,
    ElectionResultSourceOut,
)
from app.schemas.geography import GeographyOut
from app.schemas.government import (
    GovernmentBodyOut,
    PublicOfficeOut,
    RepresentativeOut,
)
from app.schemas.ingestion import (
    ExtractionOut,
    FeedSourceOut,
    FeedStatusOut,
    ObservationCountsOut,
    ReviewDecisionOut,
    SnapshotOut,
)
from app.schemas.officeholders import (
    OfficeholderCatalogOut,
    OfficeholderClaimOut,
    OfficeholderRecordOut,
    OfficeholderSourceOut,
)
from app.schemas.procurement import (
    ProcurementCatalogOut,
    ProcurementClaimOut,
    ProcurementRecordOut,
    ProcurementSourceOut,
)
from app.schemas.projects import (
    ProjectCatalogOut,
    ProjectClaimOut,
    ProjectRecordOut,
    ProjectSourceOut,
)
from app.schemas.schemes import (
    LocalizedTextOut,
    SchemeCatalogOut,
    SchemeClaimOut,
    SchemeRecordOut,
    SchemeSourceOut,
)

T = TypeVar("T")


class CatalogNotFound(LookupError):
    pass


@dataclass(frozen=True)
class CatalogPage[T]:
    data: list[T]
    meta: PageMeta


class CatalogRepository(Protocol):
    def list_geographies(
        self,
        *,
        entity_type: GeographyType | None,
        parent: str | None,
        active_on: date | None,
        query: str | None,
        page: int,
        page_size: int,
    ) -> CatalogPage[GeographyOut]: ...

    def get_geography(self, identifier: str) -> GeographyOut: ...

    def list_children(
        self, *, identifier: str, page: int, page_size: int
    ) -> CatalogPage[GeographyOut]: ...

    def list_government_bodies(
        self,
        *,
        body_type: GovernmentBodyType | None,
        parent: str | None,
        active_on: date | None,
        query: str | None,
        page: int,
        page_size: int,
    ) -> CatalogPage[GovernmentBodyOut]: ...

    def get_government_body(self, identifier: str) -> GovernmentBodyOut: ...

    def list_public_offices(
        self,
        *,
        active_on: date | None,
        query: str | None,
        page: int,
        page_size: int,
    ) -> CatalogPage[PublicOfficeOut]: ...

    def list_representatives(
        self,
        *,
        active_on: date | None,
        query: str | None,
        page: int,
        page_size: int,
    ) -> CatalogPage[RepresentativeOut]: ...

    def list_feed_statuses(self) -> list[FeedStatusOut]: ...

    def list_schemes(self, jurisdiction_code: str | None = None) -> SchemeCatalogOut: ...

    def list_budget(self) -> BudgetCatalogOut: ...

    def list_officeholders(self) -> OfficeholderCatalogOut: ...

    def list_election_results(self) -> ElectionResultCatalogOut: ...

    def list_projects(self) -> ProjectCatalogOut: ...

    def list_procurement(self) -> ProcurementCatalogOut: ...

    def list_comparisons(self) -> ComparisonCatalogOut: ...


def _parse_uuid(identifier: str) -> UUID | None:
    try:
        return UUID(identifier)
    except ValueError:
        return None


def _as_int(value: str) -> int:
    try:
        return int(value)
    except ValueError:
        return 0


def _active_clause(
    valid_from: InstrumentedAttribute[date | None],
    valid_to: InstrumentedAttribute[date | None],
    active_on: date,
) -> tuple[ColumnElement[bool], ColumnElement[bool]]:
    return (
        or_(valid_from.is_(None), valid_from <= active_on),
        or_(valid_to.is_(None), valid_to >= active_on),
    )


def _reviewed_source_clause(
    source_id: InstrumentedAttribute[UUID],
) -> ColumnElement[bool]:
    return source_id.in_(
        select(SourceReference.id).where(SourceReference.review_status == ReviewStatus.REVIEWED)
    )


def _search_pattern(query: str | None) -> str | None:
    if query is None or not (normalized := query.strip()):
        return None
    escaped = normalized.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    return f"%{escaped}%"


def _page_meta(total: int, page: int, page_size: int) -> PageMeta:
    return PageMeta(
        page=page,
        page_size=page_size,
        total=total,
        total_pages=ceil(total / page_size) if total else 0,
    )


def _provenance(source: SourceReference) -> ProvenanceSummary:
    return ProvenanceSummary(
        source_id=source.id,
        source_name=source.source_name,
        official_source_url=source.official_source_url,
        public_source_url=_citation_public_url(source),
        retrieval_date=source.retrieval_date,
        publication_date=source.publication_date,
        effective_date=source.effective_date,
        review_status=source.review_status,
        is_fixture=source.is_fixture,
    )


def _citation_public_url(source: SourceReference) -> str | None:
    """Human-readable official page recorded alongside the machine endpoint."""
    value = source.citation_metadata.get("public_source_url")
    return value if isinstance(value, str) and value else None


def _document_public_url(document: SourceDocument) -> str | None:
    value = document.document_metadata.get("public_source_url")
    return value if isinstance(value, str) and value else None


_MODERN_BUDGET_COLUMNS = ("accounts", "budget_prev", "revised_prev", "budget")
_LEGACY_EXPENDITURE_COLUMNS = ("non_plan", "plan", "total")
_LEGACY_EXPENDITURE_STATEMENTS = frozenset(
    {"revenue_expenditure", "capital_expenditure", "public_debt_disbursements"}
)


def _budget_amount_label(
    fiscal_year: str, statement: str, position: int, column_count: int
) -> str:
    """Name one value column of an AFS major head.

    A row is labelled only when its column count matches a known statement
    layout; otherwise every column is positional so the catalogue never claims
    a column meaning it cannot verify (blank source cells are dropped, so a
    shorter row cannot be mapped to named columns).
    """
    if fiscal_year >= "2017-18" and column_count == len(_MODERN_BUDGET_COLUMNS):
        return _MODERN_BUDGET_COLUMNS[position]
    if (
        statement in _LEGACY_EXPENDITURE_STATEMENTS
        and fiscal_year < "2017-18"
        and column_count == len(_LEGACY_EXPENDITURE_COLUMNS)
    ):
        return _LEGACY_EXPENDITURE_COLUMNS[position]
    return f"column_{position + 1}"


def _geography_out(item: Geography) -> GeographyOut:
    return GeographyOut(
        id=item.id,
        slug=item.slug,
        entity_type=item.entity_type,
        name_en=item.name_en,
        name_te=item.name_te,
        official_code=item.official_code,
        official_code_scheme=item.official_code_scheme,
        parent_id=item.parent_id,
        valid_from=item.valid_from,
        valid_to=item.valid_to,
        is_active=item.is_active,
        is_pilot=item.is_pilot,
        aliases=[
            AliasSummary(value=alias.alias, language=alias.language_code, kind=alias.alias_type)
            for alias in item.aliases
        ],
        has_point=item.has_point,
        has_boundary=item.has_boundary,
        boundary_precision=item.boundary_precision,
        boundary_valid_from=item.boundary_valid_from,
        boundary_valid_to=item.boundary_valid_to,
        coverage_note=item.coverage_note,
        provenance=_provenance(item.source),
    )


def _government_body_out(item: GovernmentBody, sector: str | None = None) -> GovernmentBodyOut:
    return GovernmentBodyOut(
        id=item.id,
        slug=item.slug,
        body_type=item.body_type,
        name_en=item.name_en,
        name_te=item.name_te,
        official_code=item.official_code,
        parent_id=item.parent_id,
        valid_from=item.valid_from,
        valid_to=item.valid_to,
        is_active=item.is_active,
        aliases=[
            AliasSummary(value=alias.alias, language=alias.language_code, kind=alias.alias_type)
            for alias in item.aliases
        ],
        sector=sector,
        provenance=_provenance(item.source),
    )


class SQLCatalogRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def _resolve_geography(self, identifier: str) -> Geography:
        parsed = _parse_uuid(identifier)
        if parsed is not None:
            predicate = Geography.id == parsed
        else:
            predicate = or_(
                Geography.slug == identifier,
                Geography.aliases.any(GeographyAlias.alias == identifier),
            )
        item = self.session.scalar(
            select(Geography)
            .where(predicate, _reviewed_source_clause(Geography.source_id))
            .options(
                selectinload(Geography.aliases),
                selectinload(Geography.source),
            )
        )
        if item is None:
            raise CatalogNotFound(f"geography '{identifier}' was not found")
        return item

    def _resolve_body(self, identifier: str) -> GovernmentBody:
        parsed = _parse_uuid(identifier)
        predicate = GovernmentBody.id == parsed if parsed else GovernmentBody.slug == identifier
        item = self.session.scalar(
            select(GovernmentBody)
            .where(predicate, _reviewed_source_clause(GovernmentBody.source_id))
            .options(
                selectinload(GovernmentBody.aliases),
                selectinload(GovernmentBody.source),
            )
        )
        if item is None:
            raise CatalogNotFound(f"government body '{identifier}' was not found")
        return item

    def list_geographies(
        self,
        *,
        entity_type: GeographyType | None,
        parent: str | None,
        active_on: date | None,
        query: str | None,
        page: int,
        page_size: int,
    ) -> CatalogPage[GeographyOut]:
        statement: Select[tuple[Geography]] = select(Geography).where(
            _reviewed_source_clause(Geography.source_id)
        )
        if entity_type is not None:
            statement = statement.where(Geography.entity_type == entity_type)
        if parent is not None:
            statement = statement.where(Geography.parent_id == self._resolve_geography(parent).id)
        if active_on is not None:
            statement = statement.where(
                *_active_clause(Geography.valid_from, Geography.valid_to, active_on)
            )
        if pattern := _search_pattern(query):
            statement = statement.where(
                or_(
                    Geography.name_en.ilike(pattern, escape="\\"),
                    Geography.name_te.ilike(pattern, escape="\\"),
                    Geography.aliases.any(GeographyAlias.alias.ilike(pattern, escape="\\")),
                )
            )
        return self._geography_page(statement, page, page_size)

    def _geography_page(
        self, statement: Select[tuple[Geography]], page: int, page_size: int
    ) -> CatalogPage[GeographyOut]:
        total = (
            self.session.scalar(
                select(func.count()).select_from(statement.order_by(None).subquery())
            )
            or 0
        )
        items = self.session.scalars(
            statement.options(
                selectinload(Geography.aliases),
                selectinload(Geography.source),
            )
            .order_by(Geography.name_en.asc(), Geography.id.asc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        ).all()
        return CatalogPage(
            data=[_geography_out(item) for item in items],
            meta=_page_meta(total, page, page_size),
        )

    def get_geography(self, identifier: str) -> GeographyOut:
        return _geography_out(self._resolve_geography(identifier))

    def list_children(
        self, *, identifier: str, page: int, page_size: int
    ) -> CatalogPage[GeographyOut]:
        parent = self._resolve_geography(identifier)
        return self._geography_page(
            select(Geography).where(
                Geography.parent_id == parent.id,
                _reviewed_source_clause(Geography.source_id),
            ),
            page,
            page_size,
        )

    def list_government_bodies(
        self,
        *,
        body_type: GovernmentBodyType | None,
        parent: str | None,
        active_on: date | None,
        query: str | None,
        page: int,
        page_size: int,
    ) -> CatalogPage[GovernmentBodyOut]:
        statement = (
            select(GovernmentBody, Department.sector)
            .outerjoin(Department, Department.government_body_id == GovernmentBody.id)
            .where(_reviewed_source_clause(GovernmentBody.source_id))
        )
        if body_type is not None:
            statement = statement.where(GovernmentBody.body_type == body_type)
        if parent is not None:
            statement = statement.where(GovernmentBody.parent_id == self._resolve_body(parent).id)
        if active_on is not None:
            statement = statement.where(
                *_active_clause(GovernmentBody.valid_from, GovernmentBody.valid_to, active_on)
            )
        if pattern := _search_pattern(query):
            statement = statement.where(
                or_(
                    GovernmentBody.name_en.ilike(pattern, escape="\\"),
                    GovernmentBody.name_te.ilike(pattern, escape="\\"),
                    GovernmentBody.aliases.any(
                        GovernmentBodyAlias.alias.ilike(pattern, escape="\\")
                    ),
                )
            )
        total = (
            self.session.scalar(
                select(func.count()).select_from(statement.order_by(None).subquery())
            )
            or 0
        )
        rows = self.session.execute(
            statement.options(
                selectinload(GovernmentBody.aliases),
                selectinload(GovernmentBody.source),
            )
            .order_by(GovernmentBody.name_en.asc(), GovernmentBody.id.asc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        ).all()
        return CatalogPage(
            data=[_government_body_out(item, sector) for item, sector in rows],
            meta=_page_meta(total, page, page_size),
        )

    def get_government_body(self, identifier: str) -> GovernmentBodyOut:
        item = self._resolve_body(identifier)
        sector = self.session.scalar(
            select(Department.sector).where(Department.government_body_id == item.id)
        )
        return _government_body_out(item, sector)

    def list_public_offices(
        self,
        *,
        active_on: date | None,
        query: str | None,
        page: int,
        page_size: int,
    ) -> CatalogPage[PublicOfficeOut]:
        statement = select(PublicOffice).where(_reviewed_source_clause(PublicOffice.source_id))
        if active_on is not None:
            statement = statement.where(
                *_active_clause(PublicOffice.valid_from, PublicOffice.valid_to, active_on)
            )
        if pattern := _search_pattern(query):
            statement = statement.where(
                or_(
                    PublicOffice.name_en.ilike(pattern, escape="\\"),
                    PublicOffice.name_te.ilike(pattern, escape="\\"),
                    PublicOffice.aliases.any(PublicOfficeAlias.alias.ilike(pattern, escape="\\")),
                )
            )
        total = (
            self.session.scalar(
                select(func.count()).select_from(statement.order_by(None).subquery())
            )
            or 0
        )
        items = self.session.scalars(
            statement.options(selectinload(PublicOffice.source))
            .order_by(PublicOffice.name_en.asc(), PublicOffice.id.asc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        ).all()
        return CatalogPage(
            data=[
                PublicOfficeOut(
                    id=item.id,
                    slug=item.slug,
                    name_en=item.name_en,
                    name_te=item.name_te,
                    office_type=item.office_type,
                    official_code=item.official_code,
                    government_body_id=item.government_body_id,
                    valid_from=item.valid_from,
                    valid_to=item.valid_to,
                    is_active=item.is_active,
                    has_point=item.point is not None,
                    provenance=_provenance(item.source),
                )
                for item in items
            ],
            meta=_page_meta(total, page, page_size),
        )

    def list_representatives(
        self,
        *,
        active_on: date | None,
        query: str | None,
        page: int,
        page_size: int,
    ) -> CatalogPage[RepresentativeOut]:
        statement = select(Representative).where(_reviewed_source_clause(Representative.source_id))
        if active_on is not None:
            statement = statement.where(
                *_active_clause(Representative.valid_from, Representative.valid_to, active_on)
            )
        if pattern := _search_pattern(query):
            statement = statement.where(
                or_(
                    Representative.name_en.ilike(pattern, escape="\\"),
                    Representative.name_te.ilike(pattern, escape="\\"),
                )
            )
        total = (
            self.session.scalar(
                select(func.count()).select_from(statement.order_by(None).subquery())
            )
            or 0
        )
        items = self.session.scalars(
            statement.options(selectinload(Representative.source))
            .order_by(Representative.name_en.asc(), Representative.id.asc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        ).all()
        return CatalogPage(
            data=[
                RepresentativeOut(
                    id=item.id,
                    slug=item.slug,
                    name_en=item.name_en,
                    name_te=item.name_te,
                    valid_from=item.valid_from,
                    valid_to=item.valid_to,
                    is_active=item.is_active,
                    provenance=_provenance(item.source),
                )
                for item in items
            ],
            meta=_page_meta(total, page, page_size),
        )

    def list_feed_statuses(self) -> list[FeedStatusOut]:
        """Public ingestion status for every registered API feed source."""
        sources = self.session.scalars(
            select(SourceRecord)
            .where(SourceRecord.source_type == "api_endpoint")
            .order_by(SourceRecord.name.asc())
        ).all()
        statuses: list[FeedStatusOut] = []
        for source in sources:
            documents = self.session.scalars(
                select(SourceDocument).where(SourceDocument.source_id == source.id)
            ).all()
            document_ids = [document.id for document in documents]

            latest_snapshot: SourceSnapshot | None = None
            latest_extraction: ExtractionRun | None = None
            latest_review: ReviewDecision | None = None
            total = 0
            published = 0
            if document_ids:
                latest_snapshot = self.session.scalar(
                    select(SourceSnapshot)
                    .where(SourceSnapshot.document_id.in_(document_ids))
                    .order_by(SourceSnapshot.retrieved_at.desc(), SourceSnapshot.id.desc())
                    .limit(1)
                )
                total = (
                    self.session.scalar(
                        select(func.count())
                        .select_from(SourceObservation)
                        .where(SourceObservation.document_id.in_(document_ids))
                    )
                    or 0
                )
                published = (
                    self.session.scalar(
                        select(func.count())
                        .select_from(SourceObservation)
                        .where(
                            SourceObservation.document_id.in_(document_ids),
                            SourceObservation.is_published.is_(True),
                        )
                    )
                    or 0
                )
                latest_review = self.session.scalar(
                    select(ReviewDecision)
                    .join(SourceObservation, SourceObservation.id == ReviewDecision.observation_id)
                    .where(SourceObservation.document_id.in_(document_ids))
                    .order_by(ReviewDecision.decided_at.desc(), ReviewDecision.id.desc())
                    .limit(1)
                )
            if latest_snapshot is not None:
                latest_extraction = self.session.scalar(
                    select(ExtractionRun)
                    .where(ExtractionRun.snapshot_id == latest_snapshot.id)
                    .order_by(ExtractionRun.started_at.desc(), ExtractionRun.id.desc())
                    .limit(1)
                )

            official_url = (
                documents[0].official_url if documents else f"https://{source.official_domain}"
            )
            statuses.append(
                FeedStatusOut(
                    source=FeedSourceOut(
                        name=source.name,
                        publisher=source.publisher,
                        official_source_url=official_url,
                        public_source_url=(
                            _document_public_url(documents[0]) if documents else None
                        ),
                        access_method=source.access_method,
                        review_status=source.review_status,
                    ),
                    latest_snapshot=(
                        SnapshotOut(
                            sha256=latest_snapshot.sha256,
                            retrieved_at=latest_snapshot.retrieved_at,
                            http_status=latest_snapshot.http_status,
                            content_type=latest_snapshot.content_type,
                            file_size_bytes=latest_snapshot.file_size_bytes,
                        )
                        if latest_snapshot is not None
                        else None
                    ),
                    latest_extraction=(
                        ExtractionOut(
                            adapter_name=latest_extraction.adapter_name,
                            adapter_version=latest_extraction.adapter_version,
                            status=latest_extraction.status,
                            extracted_record_count=latest_extraction.extracted_record_count,
                            software_revision=latest_extraction.software_revision,
                        )
                        if latest_extraction is not None
                        else None
                    ),
                    observation_counts=ObservationCountsOut(total=total, published=published),
                    latest_review=(
                        ReviewDecisionOut(
                            decision=latest_review.decision,
                            decided_at=latest_review.decided_at,
                        )
                        if latest_review is not None
                        else None
                    ),
                )
            )
        return statuses

    def list_schemes(self, jurisdiction_code: str | None = None) -> SchemeCatalogOut:
        """Reconstruct reviewed State/UT schemes from published observations.

        ``jurisdiction_code`` optionally limits the catalogue to one State or UT
        (ISO-3166-2 code, e.g. "IN-TN"); without it every reviewed State/UT
        scheme is returned.
        """
        query = (
            select(SourceObservation)
            .join(SourceDocument, SourceDocument.id == SourceObservation.document_id)
            .where(
                SourceObservation.entity_type == "scheme",
                SourceObservation.is_published.is_(True),
            )
        )
        if jurisdiction_code:
            query = query.where(SourceDocument.jurisdiction_code == jurisdiction_code)
        observations = self.session.scalars(
            query.order_by(SourceObservation.entity_id, SourceObservation.field_path)
        ).all()
        if not observations:
            return SchemeCatalogOut(data=[], status="prepared-empty", telugu_reviewed=False)

        grouped: dict[UUID, dict[str, str]] = {}
        for observation in observations:
            grouped.setdefault(observation.entity_id, {})[observation.field_path] = (
                observation.value_text or ""
            )

        document = self.session.get(SourceDocument, observations[0].document_id)
        if document is None:
            raise CatalogNotFound("the scheme source document is missing")
        jurisdiction = document.jurisdiction_code
        source = self._scheme_feed_source(observations[0])
        records: list[SchemeRecordOut] = []
        for entity_id in sorted(grouped):
            fields = grouped[entity_id]
            records.append(self._scheme_record_out(fields, source, jurisdiction))
        telugu_reviewed = any(
            field_path.endswith("_te") for fields in grouped.values() for field_path in fields
        )
        return SchemeCatalogOut(
            data=records,
            status="reviewed" if records else "prepared-empty",
            telugu_reviewed=telugu_reviewed,
        )

    def _scheme_feed_source(self, observation: SourceObservation) -> SchemeSourceOut:
        document = self.session.get(SourceDocument, observation.document_id)
        if document is None:
            raise CatalogNotFound("the scheme source document is missing")
        source = self.session.get(SourceRecord, document.source_id)
        if source is None:
            raise CatalogNotFound("the scheme source record is missing")
        snapshot = self.session.get(SourceSnapshot, observation.snapshot_id)
        if snapshot is None:
            raise CatalogNotFound("the scheme source snapshot is missing")
        return SchemeSourceOut(
            source_record_id=source.id,
            source_name=source.name,
            official_source_url=document.official_url,
            public_source_url=_document_public_url(document),
            retrieval_date=snapshot.retrieved_at.date(),
            review_status=source.review_status,
        )

    def _scheme_record_out(
        self,
        fields: dict[str, str],
        source: SchemeSourceOut,
        jurisdiction_code: str,
    ) -> SchemeRecordOut:
        return SchemeRecordOut(
            slug=fields.get("slug", ""),
            jurisdiction=jurisdiction_code,
            name=self._scheme_claim(fields.get("name_en", ""), source),
            description=self._scheme_claim(fields.get("description_en", ""), source),
            category=self._scheme_claim(fields.get("category_en", ""), source),
            department=None,
            districts=None,
            eligibility=None,
        )

    def _scheme_claim(self, value: str, source: SchemeSourceOut) -> SchemeClaimOut:
        return SchemeClaimOut(
            classification="official",
            value=LocalizedTextOut(en=value, te=""),
            source=source,
        )

    def list_budget(self) -> BudgetCatalogOut:
        """Reconstruct reviewed Andhra Pradesh budget major heads from observations."""
        observations = self.session.scalars(
            select(SourceObservation)
            .where(
                SourceObservation.entity_type == "budget_line",
                SourceObservation.is_published.is_(True),
            )
            .order_by(SourceObservation.entity_id, SourceObservation.field_path)
        ).all()
        if not observations:
            return BudgetCatalogOut(data=[], status="prepared-empty")

        grouped: dict[UUID, dict[str, str | Decimal]] = {}
        for observation in observations:
            value: str | Decimal = (
                observation.value_number
                if observation.value_number is not None
                else observation.value_text or ""
            )
            grouped.setdefault(observation.entity_id, {})[observation.field_path] = value

        source = self._budget_feed_source(observations[0])
        records: list[BudgetLineOut] = []
        for entity_id in sorted(grouped):
            fields = grouped[entity_id]
            record = self._budget_line_out(fields, source)
            if record is not None:
                records.append(record)
        return BudgetCatalogOut(
            data=records,
            status="reviewed" if records else "prepared-empty",
        )

    def _budget_feed_source(self, observation: SourceObservation) -> BudgetSourceOut:
        document = self.session.get(SourceDocument, observation.document_id)
        if document is None:
            raise CatalogNotFound("the budget source document is missing")
        source = self.session.get(SourceRecord, document.source_id)
        if source is None:
            raise CatalogNotFound("the budget source record is missing")
        snapshot = self.session.get(SourceSnapshot, observation.snapshot_id)
        if snapshot is None:
            raise CatalogNotFound("the budget source snapshot is missing")
        return BudgetSourceOut(
            source_record_id=source.id,
            source_name=source.name,
            official_source_url=document.official_url,
            public_source_url=_document_public_url(document),
            retrieval_date=snapshot.retrieved_at.date(),
            review_status=source.review_status,
        )

    def _budget_line_out(
        self,
        fields: dict[str, str | Decimal],
        source: BudgetSourceOut,
    ) -> BudgetLineOut | None:
        slug = str(fields.get("slug", ""))
        name_en = str(fields.get("name_en", ""))
        if not slug or not name_en:
            return None
        statement = str(fields.get("statement", ""))
        fiscal_year = str(fields.get("fiscal_year", ""))
        unit = str(fields.get("unit", ""))

        amount_entries: list[tuple[str, Decimal]] = []
        index = 1
        while True:
            rupee = fields.get(f"value_{index}")
            token = fields.get(f"value_{index}_text")
            if not isinstance(rupee, Decimal) or not isinstance(token, str):
                break
            amount_entries.append((token, rupee))
            index += 1
        amounts = [
            BudgetAmountOut(
                label=_budget_amount_label(
                    fiscal_year, statement, position, len(amount_entries)
                ),
                value_text=token,
                rupees=rupee,
            )
            for position, (token, rupee) in enumerate(amount_entries)
        ]

        estimate = fields.get("amount")
        estimate_text = fields.get("amount_text")
        if not isinstance(estimate, Decimal) or not isinstance(estimate_text, str):
            return None

        return BudgetLineOut(
            slug=slug,
            fiscal_year=fiscal_year,
            statement=statement,
            code=str(fields.get("code", "")),
            name=self._budget_claim(name_en, source),
            unit=unit,
            amounts=amounts,
            budget_estimate=self._budget_claim(estimate_text, source),
            source=source,
        )

    def _budget_claim(self, value: str, source: BudgetSourceOut) -> BudgetClaimOut:
        return BudgetClaimOut(
            classification="official",
            value=LocalizedTextOut(en=value, te=""),
            source=source,
        )

    def list_officeholders(self) -> OfficeholderCatalogOut:
        observations = self.session.scalars(
            select(SourceObservation)
            .where(
                SourceObservation.entity_type == "officeholder",
                SourceObservation.is_published.is_(True),
            )
            .order_by(SourceObservation.entity_id, SourceObservation.field_path)
        ).all()
        if not observations:
            return OfficeholderCatalogOut(data=[], status="prepared-empty", telugu_reviewed=False)

        grouped: dict[UUID, dict[str, str]] = {}
        for observation in observations:
            grouped.setdefault(observation.entity_id, {})[observation.field_path] = (
                observation.value_text or ""
            )

        source = self._officeholder_feed_source(observations[0])
        records: list[OfficeholderRecordOut] = []
        for entity_id in sorted(grouped):
            fields = grouped[entity_id]
            records.append(
                OfficeholderRecordOut(
                    slug=fields.get("slug", ""),
                    person_name=OfficeholderClaimOut(
                        classification="official",
                        value=LocalizedTextOut(
                            en=fields.get("person_name_en", ""),
                            te=fields.get("person_name_te", ""),
                        ),
                        source=source,
                    ),
                    office_title=OfficeholderClaimOut(
                        classification="official",
                        value=LocalizedTextOut(
                            en=fields.get("office_title_en", ""),
                            te=fields.get("office_title_te", ""),
                        ),
                        source=source,
                    ),
                    government_body=OfficeholderClaimOut(
                        classification="official",
                        value=LocalizedTextOut(
                            en=fields.get("government_body_en", ""),
                            te=fields.get("government_body_te", ""),
                        ),
                        source=source,
                    ),
                    districts=OfficeholderClaimOut(
                        classification="official",
                        value=[
                            LocalizedTextOut(
                                en=fields.get("district_en", ""),
                                te=fields.get("district_te", ""),
                            )
                        ]
                        if fields.get("district_en")
                        else [],
                        source=source,
                    ),
                    constituency=OfficeholderClaimOut(
                        classification="official",
                        value=LocalizedTextOut(
                            en=fields.get("constituency_en", ""),
                            te=fields.get("constituency_te", ""),
                        ),
                        source=source,
                    ),
                    term_period=OfficeholderClaimOut(
                        classification="official",
                        value=LocalizedTextOut(
                            en=fields.get("term_period_en", ""),
                            te=fields.get("term_period_te", ""),
                        ),
                        source=source,
                    ),
                    party=OfficeholderClaimOut(
                        classification="official",
                        value=LocalizedTextOut(
                            en=fields.get("party_en", ""),
                            te=fields.get("party_te", ""),
                        ),
                        source=source,
                    )
                    if fields.get("party_en")
                    else None,
                )
            )
        status = "reviewed" if records else "prepared-empty"
        return OfficeholderCatalogOut(data=records, status=status)

    def _officeholder_feed_source(self, observation: SourceObservation) -> OfficeholderSourceOut:
        document = self.session.get(SourceDocument, observation.document_id)
        source = self.session.get(SourceRecord, document.source_id) if document else None
        snapshot = self.session.get(SourceSnapshot, observation.snapshot_id)
        return OfficeholderSourceOut(
            source_record_id=source.id if source else observation.entity_id,
            source_name=source.name if source else "AP Legislative Assembly",
            official_source_url=document.official_url if document else "https://aplegislature.org",
            public_source_url=_document_public_url(document) if document else None,
            retrieval_date=snapshot.retrieved_at.date() if snapshot else date.today(),
            review_status=source.review_status if source else ReviewStatus.REVIEWED,
        )

    def list_election_results(self) -> ElectionResultCatalogOut:
        observations = self.session.scalars(
            select(SourceObservation)
            .where(
                SourceObservation.entity_type == "election_result",
                SourceObservation.is_published.is_(True),
            )
            .order_by(SourceObservation.entity_id, SourceObservation.field_path)
        ).all()
        if not observations:
            return ElectionResultCatalogOut(
                data=[], status="prepared-empty", telugu_reviewed=False
            )

        grouped: dict[UUID, dict[str, str]] = {}
        for observation in observations:
            grouped.setdefault(observation.entity_id, {})[observation.field_path] = (
                observation.value_text or ""
            )

        source = self._election_result_feed_source(observations[0])
        records: list[ElectionResultRecordOut] = []
        for entity_id in sorted(grouped):
            fields = grouped[entity_id]
            annotation_en = fields.get("annotation_en", "")
            records.append(
                ElectionResultRecordOut(
                    slug=fields.get("slug", ""),
                    term_id=_as_int(fields.get("term_id", "0")),
                    member_sl_no=fields.get("member_sl_no", ""),
                    constituency_no=fields.get("constituency_no", ""),
                    reserved_category=fields.get("reserved_category", ""),
                    member_name=ElectionResultClaimOut(
                        classification="official",
                        value=LocalizedTextOut(
                            en=fields.get("member_name_en", ""),
                            te=fields.get("member_name_te", ""),
                        ),
                        source=source,
                    ),
                    constituency=ElectionResultClaimOut(
                        classification="official",
                        value=LocalizedTextOut(
                            en=fields.get("constituency_en", ""),
                            te=fields.get("constituency_te", ""),
                        ),
                        source=source,
                    ),
                    district=ElectionResultClaimOut(
                        classification="official",
                        value=LocalizedTextOut(
                            en=fields.get("district_en", ""),
                            te=fields.get("district_te", ""),
                        ),
                        source=source,
                    ),
                    party=ElectionResultClaimOut(
                        classification="official",
                        value=LocalizedTextOut(
                            en=fields.get("party_en", ""),
                            te=fields.get("party_te", ""),
                        ),
                        source=source,
                    )
                    if fields.get("party_en")
                    else None,
                    term_period=ElectionResultClaimOut(
                        classification="official",
                        value=LocalizedTextOut(
                            en=fields.get("term_period_en", ""),
                            te=fields.get("term_period_te", ""),
                        ),
                        source=source,
                    ),
                    elected_via=ElectionResultClaimOut(
                        classification="official",
                        value=fields.get("elected_via", ""),
                        source=source,
                    ),
                    seat_status=ElectionResultClaimOut(
                        classification="official",
                        value=fields.get("seat_status", ""),
                        source=source,
                    ),
                    annotation=ElectionResultClaimOut(
                        classification="official",
                        value=LocalizedTextOut(
                            en=annotation_en,
                            te=fields.get("annotation_te", ""),
                        ),
                        source=source,
                    )
                    if annotation_en
                    else None,
                )
            )
        status = "reviewed" if records else "prepared-empty"
        return ElectionResultCatalogOut(data=records, status=status)

    def _election_result_feed_source(
        self, observation: SourceObservation
    ) -> ElectionResultSourceOut:
        document = self.session.get(SourceDocument, observation.document_id)
        source = self.session.get(SourceRecord, document.source_id) if document else None
        snapshot = self.session.get(SourceSnapshot, observation.snapshot_id)
        return ElectionResultSourceOut(
            source_record_id=source.id if source else observation.entity_id,
            source_name=source.name if source else "AP Legislative Assembly",
            official_source_url=document.official_url if document else "https://aplegislature.org",
            public_source_url=_document_public_url(document) if document else None,
            retrieval_date=snapshot.retrieved_at.date() if snapshot else date.today(),
            review_status=source.review_status if source else ReviewStatus.REVIEWED,
        )

    def list_projects(self) -> ProjectCatalogOut:
        observations = self.session.scalars(
            select(SourceObservation)
            .where(
                SourceObservation.entity_type == "project",
                SourceObservation.is_published.is_(True),
            )
            .order_by(SourceObservation.entity_id, SourceObservation.field_path)
        ).all()
        if not observations:
            return ProjectCatalogOut(data=[], status="prepared-empty", telugu_reviewed=False)

        grouped: dict[UUID, dict[str, str]] = {}
        for observation in observations:
            grouped.setdefault(observation.entity_id, {})[observation.field_path] = (
                observation.value_text or ""
            )

        source = self._project_feed_source(observations[0])
        records: list[ProjectRecordOut] = []
        for entity_id in sorted(grouped):
            fields = grouped[entity_id]
            records.append(
                ProjectRecordOut(
                    slug=fields.get("slug", ""),
                    name=ProjectClaimOut(
                        classification="official",
                        value=LocalizedTextOut(
                            en=fields.get("name_en", ""),
                            te=fields.get("name_te", ""),
                        ),
                        source=source,
                    ),
                    description=ProjectClaimOut(
                        classification="official",
                        value=LocalizedTextOut(
                            en=fields.get("description_en", ""),
                            te=fields.get("description_te", ""),
                        ),
                        source=source,
                    ),
                    department=ProjectClaimOut(
                        classification="official",
                        value=LocalizedTextOut(
                            en=fields.get("department_en", ""),
                            te=fields.get("department_te", ""),
                        ),
                        source=source,
                    ),
                    districts=ProjectClaimOut(
                        classification="official",
                        value=[
                            LocalizedTextOut(
                                en=fields.get("district_en", ""),
                                te=fields.get("district_te", ""),
                            )
                        ]
                        if fields.get("district_en")
                        else [],
                        source=source,
                    ),
                    status=ProjectClaimOut(
                        classification="official",
                        value=LocalizedTextOut(
                            en=fields.get("status_en", ""),
                            te=fields.get("status_te", ""),
                        ),
                        source=source,
                    ),
                    project_type=ProjectClaimOut(
                        classification="official",
                        value=LocalizedTextOut(
                            en=fields.get("project_type_en", ""),
                            te=fields.get("project_type_te", ""),
                        ),
                        source=source,
                    ),
                )
            )
        return ProjectCatalogOut(data=records, status="reviewed" if records else "prepared-empty")

    def _project_feed_source(self, observation: SourceObservation) -> ProjectSourceOut:
        document = self.session.get(SourceDocument, observation.document_id)
        source = self.session.get(SourceRecord, document.source_id) if document else None
        snapshot = self.session.get(SourceSnapshot, observation.snapshot_id)
        return ProjectSourceOut(
            source_record_id=source.id if source else observation.entity_id,
            source_name=source.name if source else "AP Infrastructure Portal",
            official_source_url=document.official_url if document else "https://ap.gov.in",
            public_source_url=_document_public_url(document) if document else None,
            retrieval_date=snapshot.retrieved_at.date() if snapshot else date.today(),
            review_status=source.review_status if source else ReviewStatus.REVIEWED,
        )

    def list_procurement(self) -> ProcurementCatalogOut:
        observations = self.session.scalars(
            select(SourceObservation)
            .where(
                SourceObservation.entity_type == "procurement",
                SourceObservation.is_published.is_(True),
            )
            .order_by(SourceObservation.entity_id, SourceObservation.field_path)
        ).all()
        if not observations:
            return ProcurementCatalogOut(data=[], status="prepared-empty", telugu_reviewed=False)

        grouped: dict[UUID, dict[str, str]] = {}
        for observation in observations:
            grouped.setdefault(observation.entity_id, {})[observation.field_path] = (
                observation.value_text or ""
            )

        source = self._procurement_feed_source(observations[0])
        records: list[ProcurementRecordOut] = []
        for entity_id in sorted(grouped):
            fields = grouped[entity_id]
            records.append(
                ProcurementRecordOut(
                    slug=fields.get("slug", ""),
                    title=ProcurementClaimOut(
                        classification="official",
                        value=LocalizedTextOut(
                            en=fields.get("title_en", ""),
                            te=fields.get("title_te", ""),
                        ),
                        source=source,
                    ),
                    stage=ProcurementClaimOut(
                        classification="official",
                        value=LocalizedTextOut(
                            en=fields.get("stage_en", ""),
                            te=fields.get("stage_te", ""),
                        ),
                        source=source,
                    ),
                    description=ProcurementClaimOut(
                        classification="official",
                        value=LocalizedTextOut(
                            en=fields.get("description_en", ""),
                            te=fields.get("description_te", ""),
                        ),
                        source=source,
                    ),
                    department=ProcurementClaimOut(
                        classification="official",
                        value=LocalizedTextOut(
                            en=fields.get("department_en", ""),
                            te=fields.get("department_te", ""),
                        ),
                        source=source,
                    ),
                    districts=ProcurementClaimOut(
                        classification="official",
                        value=[
                            LocalizedTextOut(
                                en=fields.get("district_en", ""),
                                te=fields.get("district_te", ""),
                            )
                        ]
                        if fields.get("district_en")
                        else [],
                        source=source,
                    ),
                )
            )
        status = "reviewed" if records else "prepared-empty"
        return ProcurementCatalogOut(data=records, status=status)

    def list_comparisons(self) -> ComparisonCatalogOut:
        """Reconstruct reviewed calculated claims-vs-records comparisons."""
        comparisons = self.session.scalars(
            select(ClaimRecordComparison).where(
                ClaimRecordComparison.is_published.is_(True)
            )
        ).all()
        if not comparisons:
            return ComparisonCatalogOut(data=[], status="prepared-empty")

        data: list[ClaimRecordComparisonOut] = []
        for comparison in comparisons:
            claim = self._comparison_observation_out(
                comparison, claim_side=True
            )
            record = self._comparison_observation_out(
                comparison, claim_side=False
            )
            data.append(
                ClaimRecordComparisonOut(
                    id=comparison.id,
                    comparison_kind=comparison.comparison_kind,
                    entity_type=comparison.entity_type,
                    entity_id=comparison.entity_id,
                    entity_label=LocalizedTextOut(
                        en=comparison.entity_label_en,
                        te=comparison.entity_label_te or "",
                    ),
                    verdict=comparison.verdict,
                    claim=claim,
                    record=record,
                    difference=comparison.difference,
                    difference_percent=comparison.difference_percent,
                    tolerance_percent=comparison.tolerance_percent,
                    method=LocalizedTextOut(
                        en=comparison.method_en,
                        te=comparison.method_te or "",
                    ),
                    reviewer_identity=comparison.reviewer_identity,
                    decided_at=comparison.decided_at,
                    created_at=comparison.created_at,
                )
            )
        return ComparisonCatalogOut(data=data, status="reviewed")

    def _comparison_observation_out(
        self,
        comparison: ClaimRecordComparison,
        *,
        claim_side: bool,
    ) -> ComparisonObservationOut:
        observation_id = (
            comparison.claim_observation_id
            if claim_side
            else comparison.record_observation_id
        )
        observation = self.session.get(SourceObservation, observation_id)
        document = (
            self.session.get(SourceDocument, observation.document_id)
            if observation is not None
            else None
        )
        source = (
            self.session.get(SourceRecord, document.source_id)
            if document is not None
            else None
        )
        return ComparisonObservationOut(
            observation_id=observation_id,
            label=LocalizedTextOut(
                en=comparison.claim_label_en if claim_side else comparison.record_label_en,
                te=(
                    comparison.claim_label_te
                    if claim_side
                    else comparison.record_label_te
                )
                or "",
            ),
            value=LocalizedTextOut(
                en=(
                    observation.value_text
                    if observation is not None and observation.value_text
                    else (
                        str(observation.value_number)
                        if observation is not None and observation.value_number is not None
                        else ""
                    )
                ),
                te="",
            ),
            source_name=source.name if source else "",
            official_source_url=document.official_url if document else None,
            public_source_url=_document_public_url(document) if document else None,
            review_status=source.review_status if source else ReviewStatus.PENDING,
        )

    def _procurement_feed_source(self, observation: SourceObservation) -> ProcurementSourceOut:
        document = self.session.get(SourceDocument, observation.document_id)
        source = self.session.get(SourceRecord, document.source_id) if document else None
        snapshot = self.session.get(SourceSnapshot, observation.snapshot_id)
        return ProcurementSourceOut(
            source_record_id=source.id if source else observation.entity_id,
            source_name=source.name if source else "AP e-Procurement Portal",
            official_source_url=document.official_url if document else "https://apeprocurement.gov.in",
            public_source_url=_document_public_url(document) if document else None,
            retrieval_date=snapshot.retrieved_at.date() if snapshot else date.today(),
            review_status=source.review_status if source else ReviewStatus.REVIEWED,
        )
