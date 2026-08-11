from collections.abc import Generator
from datetime import date
from uuid import UUID

import pytest
from fastapi.testclient import TestClient

from app.api.dependencies import get_catalog
from app.main import app, get_readiness_checker
from app.models.enums import (
    AliasType,
    GeographyType,
    GovernmentBodyType,
    LanguageCode,
    ReviewStatus,
)
from app.repositories import CatalogNotFound, CatalogPage
from app.schemas.common import AliasSummary, PageMeta, ProvenanceSummary
from app.schemas.geography import GeographyOut
from app.schemas.government import (
    GovernmentBodyOut,
    PublicOfficeOut,
    RepresentativeOut,
)

SOURCE_ID = UUID("3ad32d2b-4867-5e58-8918-a9b513e6cf66")
STATE_ID = UUID("b180584f-6f1c-5a61-9465-83accbf866c7")
DISTRICT_ID = UUID("47a2e870-b0b2-5582-a78f-45590392ae33")
BODY_ID = UUID("ce0c09e7-ff6f-56a2-a314-f6af44fa999a")


def provenance() -> ProvenanceSummary:
    return ProvenanceSummary(
        source_id=SOURCE_ID,
        source_name="Official test source",
        official_source_url="https://example.gov.in/source",
        retrieval_date=date(2026, 8, 10),
        effective_date=date(2022, 4, 4),
        review_status=ReviewStatus.REVIEWED,
        is_fixture=True,
    )


def geography() -> GeographyOut:
    return GeographyOut(
        id=DISTRICT_ID,
        slug="visakhapatnam",
        entity_type=GeographyType.DISTRICT,
        name_en="Visakhapatnam",
        name_te="విశాఖపట్నం",
        official_code="520",
        official_code_scheme="LGD district code",
        parent_id=STATE_ID,
        valid_from=date(2022, 4, 4),
        valid_to=None,
        is_active=True,
        is_pilot=True,
        aliases=[
            AliasSummary(
                value="Vizag",
                language=LanguageCode.EN,
                kind=AliasType.ALTERNATE,
            )
        ],
        has_point=False,
        has_boundary=False,
        boundary_precision=None,
        boundary_valid_from=None,
        boundary_valid_to=None,
        coverage_note=None,
        provenance=provenance(),
    )


def government_body() -> GovernmentBodyOut:
    return GovernmentBodyOut(
        id=BODY_ID,
        slug="school-education",
        body_type=GovernmentBodyType.DEPARTMENT,
        name_en="School Education",
        name_te="పాఠశాల విద్యా శాఖ",
        official_code="AP-ORG-32",
        parent_id=None,
        valid_from=None,
        valid_to=None,
        is_active=True,
        aliases=[],
        sector="education",
        provenance=provenance(),
    )


class FakeCatalog:
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
        item = geography()
        haystack = " ".join(
            [item.name_en, item.name_te or "", *(alias.value for alias in item.aliases)]
        ).casefold()
        data = [item] if not query or query.casefold() in haystack else []
        if entity_type and entity_type != item.entity_type:
            data = []
        return CatalogPage(
            data=data,
            meta=PageMeta(
                page=page,
                page_size=page_size,
                total=len(data),
                total_pages=1 if data else 0,
            ),
        )

    def get_geography(self, identifier: str) -> GeographyOut:
        item = geography()
        if identifier not in {item.slug, str(item.id)}:
            raise CatalogNotFound(f"geography '{identifier}' was not found")
        return item

    def list_children(
        self, *, identifier: str, page: int, page_size: int
    ) -> CatalogPage[GeographyOut]:
        if identifier != "andhra-pradesh":
            raise CatalogNotFound(f"geography '{identifier}' was not found")
        return CatalogPage(
            data=[geography()],
            meta=PageMeta(page=page, page_size=page_size, total=1, total_pages=1),
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
        item = government_body()
        data = [item]
        if query and query.casefold() not in f"{item.name_en} {item.name_te}".casefold():
            data = []
        if body_type and body_type != item.body_type:
            data = []
        return CatalogPage(
            data=data,
            meta=PageMeta(
                page=page,
                page_size=page_size,
                total=len(data),
                total_pages=1 if data else 0,
            ),
        )

    def get_government_body(self, identifier: str) -> GovernmentBodyOut:
        item = government_body()
        if identifier not in {item.slug, str(item.id)}:
            raise CatalogNotFound(f"government body '{identifier}' was not found")
        return item

    def list_public_offices(
        self,
        *,
        active_on: date | None,
        query: str | None,
        page: int,
        page_size: int,
    ) -> CatalogPage[PublicOfficeOut]:
        return CatalogPage(
            data=[],
            meta=PageMeta(page=page, page_size=page_size, total=0, total_pages=0),
        )

    def list_representatives(
        self,
        *,
        active_on: date | None,
        query: str | None,
        page: int,
        page_size: int,
    ) -> CatalogPage[RepresentativeOut]:
        return CatalogPage(
            data=[],
            meta=PageMeta(page=page, page_size=page_size, total=0, total_pages=0),
        )


@pytest.fixture
def client() -> Generator[TestClient, None, None]:
    app.dependency_overrides[get_catalog] = FakeCatalog
    app.dependency_overrides[get_readiness_checker] = lambda: lambda: "3.5.2"
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
