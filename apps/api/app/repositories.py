from dataclasses import dataclass
from datetime import date
from math import ceil
from typing import Protocol, TypeVar
from uuid import UUID

from sqlalchemy import Select, func, or_, select
from sqlalchemy.orm import InstrumentedAttribute, Session, selectinload
from sqlalchemy.sql.elements import ColumnElement

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
from app.models.source import SourceReference
from app.schemas.common import AliasSummary, PageMeta, ProvenanceSummary
from app.schemas.geography import GeographyOut
from app.schemas.government import (
    GovernmentBodyOut,
    PublicOfficeOut,
    RepresentativeOut,
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


def _parse_uuid(identifier: str) -> UUID | None:
    try:
        return UUID(identifier)
    except ValueError:
        return None


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
        retrieval_date=source.retrieval_date,
        publication_date=source.publication_date,
        effective_date=source.effective_date,
        review_status=source.review_status,
        is_fixture=source.is_fixture,
    )


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
        predicate = Geography.id == parsed if parsed else Geography.slug == identifier
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
