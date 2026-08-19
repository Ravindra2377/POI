from collections.abc import Generator
from datetime import UTC, date, datetime
from uuid import UUID

import pytest
from fastapi.testclient import TestClient

from app.api.dependencies import get_catalog
from app.main import app, get_readiness_checker
from app.models.enums import (
    AccessMethod,
    AliasType,
    ExtractionStatus,
    GeographyType,
    GovernmentBodyType,
    LanguageCode,
    ReviewDecisionType,
    ReviewStatus,
)
from app.repositories import CatalogNotFound, CatalogPage
from app.schemas.budget import (
    BudgetAmountOut,
    BudgetCatalogOut,
    BudgetClaimOut,
    BudgetLineOut,
    BudgetSourceOut,
)
from app.schemas.common import AliasSummary, PageMeta, ProvenanceSummary
from app.schemas.comparisons import ComparisonCatalogOut
from app.schemas.elections import ElectionResultCatalogOut
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
from app.schemas.schemes import (
    LocalizedTextOut,
    SchemeCatalogOut,
    SchemeClaimOut,
    SchemeRecordOut,
    SchemeSourceOut,
)

SOURCE_ID = UUID("3ad32d2b-4867-5e58-8918-a9b513e6cf66")
STATE_ID = UUID("b180584f-6f1c-5a61-9465-83accbf866c7")
DISTRICT_ID = UUID("47a2e870-b0b2-5582-a78f-45590392ae33")
BODY_ID = UUID("ce0c09e7-ff6f-56a2-a314-f6af44fa999a")
SCHEME_SOURCE_ID = UUID("1f4a0b2c-6d7e-4f8a-9b3c-2e5d7f8a9b0c")


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


def feed_status() -> FeedStatusOut:
    return FeedStatusOut(
        source=FeedSourceOut(
            name="Local Government Directory district list",
            publisher="Local Government Directory (LGD)",
            official_source_url="https://lgdirectory.gov.in/webservices/lgdws/districtList",
            public_source_url="https://lgdirectory.gov.in/",
            access_method=AccessMethod.API,
            review_status=ReviewStatus.REVIEWED,
        ),
        latest_snapshot=SnapshotOut(
            sha256="a" * 64,
            retrieved_at=datetime(2026, 8, 15, 8, 0, tzinfo=UTC),
            http_status=200,
            content_type="application/json",
            file_size_bytes=1234,
        ),
        latest_extraction=ExtractionOut(
            adapter_name="lgd-district-list-adapter",
            adapter_version="1.0.0",
            status=ExtractionStatus.SUCCEEDED,
            extracted_record_count=28,
            software_revision="district-feed-1.0.0",
        ),
        observation_counts=ObservationCountsOut(total=112, published=112),
        latest_review=ReviewDecisionOut(
            decision=ReviewDecisionType.APPROVE,
            decided_at=datetime(2026, 8, 15, 8, 1, tzinfo=UTC),
        ),
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


def scheme_source() -> SchemeSourceOut:
    return SchemeSourceOut(
        source_record_id=SCHEME_SOURCE_ID,
        source_name="myScheme Andhra Pradesh state scheme search",
        official_source_url="https://api.myscheme.gov.in/search/v3/schemes?lang=en",
        public_source_url="https://www.myscheme.gov.in/search/state/Andhra Pradesh",
        retrieval_date=date(2026, 8, 15),
        review_status=ReviewStatus.REVIEWED,
    )


def budget_catalog() -> BudgetCatalogOut:
    source = BudgetSourceOut(
        source_record_id=UUID("9d0e4f5a-1b2c-4d3e-8f6a-7b8c9d0e1f2a"),
        source_name="Annual Financial Statement 2022-23 (Volume-I-1)",
        official_source_url="https://apfinance.gov.in/budget-volumes/2022-23/afs-2022-23-v-1-1.pdf",
        public_source_url="https://apfinance.gov.in/budget.html",
        retrieval_date=date(2026, 8, 15),
        review_status=ReviewStatus.REVIEWED,
    )

    def claim(value: str) -> BudgetClaimOut:
        return BudgetClaimOut(
            classification="official",
            value=LocalizedTextOut(en=value, te=""),
            source=source,
        )

    return BudgetCatalogOut(
        data=[
            BudgetLineOut(
                slug="2022-23-revenue_receipts-0202-education-sports-art-and-culture",
                fiscal_year="2022-23",
                statement="revenue_receipts",
                code="0202",
                name=claim("Education, Sports, Art and Culture"),
                unit="Thousands",
                amounts=[
                    BudgetAmountOut(
                        label="accounts", value_text="1195,77,29", rupees=11957729000
                    ),
                    BudgetAmountOut(
                        label="budget_prev", value_text="1219,20,10", rupees=12192010000
                    ),
                    BudgetAmountOut(
                        label="revised_prev", value_text="1219,20,10", rupees=12192010000
                    ),
                    BudgetAmountOut(
                        label="budget", value_text="89,57,00", rupees=895700000
                    ),
                ],
                budget_estimate=claim("89,57,00"),
                source=source,
            )
        ],
        status="reviewed",
    )


def scheme_catalog() -> SchemeCatalogOut:
    source = scheme_source()

    def claim(value: str) -> SchemeClaimOut:
        return SchemeClaimOut(
            classification="official",
            value=LocalizedTextOut(en=value, te=""),
            source=source,
        )

    return SchemeCatalogOut(
        data=[
            SchemeRecordOut(
                slug="ysrrb",
                jurisdiction="IN-AP",
                name=claim("YSR Rythu Bharosa"),
                description=claim(
                    "Launched in June 2019, the scheme \"YSR RYTHU BHAROSA\" is being "
                    "implemented by the Dept. of Agriculture, Govt. of Andhra Pradesh."
                ),
                category=claim("Agriculture,Rural & Environment"),
                department=None,
                districts=None,
                eligibility=None,
            )
        ],
        status="reviewed",
        telugu_reviewed=False,
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
        if identifier not in {"andhra-pradesh", "in-ap"}:
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

    def list_feed_statuses(self) -> list[FeedStatusOut]:
        return [feed_status()]

    def list_schemes(
        self, jurisdiction_code: str | None = None
    ) -> SchemeCatalogOut:
        return scheme_catalog()

    def list_budget(self) -> BudgetCatalogOut:
        return budget_catalog()

    def list_election_results(self) -> ElectionResultCatalogOut:
        return ElectionResultCatalogOut(data=[], status="prepared-empty")

    def list_comparisons(self) -> ComparisonCatalogOut:
        return ComparisonCatalogOut(data=[], status="prepared-empty")


@pytest.fixture
def client() -> Generator[TestClient, None, None]:
    app.dependency_overrides[get_catalog] = FakeCatalog
    app.dependency_overrides[get_readiness_checker] = lambda: lambda: "3.5.2"
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
