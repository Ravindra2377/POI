import os
from datetime import UTC, datetime
from pathlib import Path

import pytest
from sqlalchemy import Engine, create_engine, func, select
from sqlalchemy.orm import Session

from alembic import command
from alembic.config import Config
from app.db import normalize_database_url
from app.ingestion.officeholders import (
    FeedSnapshot,
    build_officeholders_report_url,
    parse_officeholders,
    review_officeholders_observations,
    store_officeholders_feed,
)
from app.ingestion.representatives import store_representatives
from app.models.geography import Geography, GeographyRelationship
from app.models.government import (
    GovernmentBody,
    OfficeJurisdiction,
    OfficialRole,
    PublicOffice,
    Representative,
    RepresentativeTerm,
)
from app.repositories import SQLCatalogRepository
from app.seeds import seed_stage1

TEST_DATABASE_URL = os.getenv("TEST_DATABASE_URL")
pytestmark = pytest.mark.skipif(
    not TEST_DATABASE_URL,
    reason="TEST_DATABASE_URL is required for PostgreSQL/PostGIS integration tests",
)

FIXTURES = Path(__file__).parents[1] / "fixtures"
TERM16_REPORT = (FIXTURES / "ap_legislature_members_term16.html").read_bytes()


def _alembic_config() -> Config:
    config = Config(str(Path(__file__).parents[2] / "alembic.ini"))
    assert TEST_DATABASE_URL is not None
    config.set_main_option("sqlalchemy.url", normalize_database_url(TEST_DATABASE_URL))
    return config


def _prepare_database() -> Engine:
    assert TEST_DATABASE_URL is not None
    assert "_test" in TEST_DATABASE_URL, "integration tests require a dedicated test database"
    config = _alembic_config()
    command.downgrade(config, "base")
    command.upgrade(config, "20260810_0001")
    engine = create_engine(normalize_database_url(TEST_DATABASE_URL))
    with Session(engine) as session, session.begin():
        seed_stage1(session)
    command.upgrade(config, "head")
    return engine


def _snapshot(retrieved_at: datetime) -> FeedSnapshot:
    return FeedSnapshot(
        key="ap-legislature-officeholders-term16",
        name="AP Legislative Assembly member report (Term XVI)",
        publisher="Andhra Pradesh Legislature Secretariat",
        url=build_officeholders_report_url(16),
        public_url="https://aplegislature.org",
        request_method="GET",
        request_body=None,
        content_type="text/html",
        raw=TERM16_REPORT,
        retrieved_at=retrieved_at,
    )


def test_representative_adapter_materializes_records_idempotently(tmp_path: Path) -> None:
    engine = _prepare_database()
    now = datetime.now(UTC)

    with Session(engine) as session, session.begin():
        records = parse_officeholders(TERM16_REPORT, term_id=16)
        stored = store_officeholders_feed(session, tmp_path, _snapshot(now), records)
        review_officeholders_observations(
            session,
            extraction_run_id=stored.extraction_run_id,
            reviewer_identity="integration:officeholder-feed",
            decided_at=now,
        )

    with Session(engine) as session, session.begin():
        first = store_representatives(session, reviewer_identity="integration:representatives")

    assert first.government_bodies_created == 1
    assert first.official_roles_created == 1
    assert first.representatives_created == 3
    assert first.representative_terms_created == 3
    assert first.public_offices_created == 3
    assert first.office_jurisdictions_created == 3
    assert first.geographies_created == 3
    assert first.geography_relationships_created == 3

    with Session(engine) as session:
        catalog = SQLCatalogRepository(session)

        representatives = catalog.list_representatives(
            active_on=None, query=None, page=1, page_size=25
        )
        assert representatives.meta.total == 3
        names = {item.name_en for item in representatives.data}
        assert names == {"SRI ASHOK BENDALAM", "SMT. GOUTHU SIREESHA", "SRI KALAVA SRINIVASULU"}

        offices = catalog.list_public_offices(active_on=None, query=None, page=1, page_size=25)
        assert offices.meta.total == 3
        office_slugs = {item.slug for item in offices.data}
        assert office_slugs == {"mla-ichchapuram", "mla-palasa", "mla-rayadurg"}
        for office in offices.data:
            assert office.has_point is False

        body = catalog.get_government_body("andhra-pradesh-legislative-assembly")
        assert body.name_en == "Andhra Pradesh Legislative Assembly"

        constituencies = catalog.list_geographies(
            entity_type=None,
            parent=None,
            active_on=None,
            query=None,
            page=1,
            page_size=100,
        )
        constituency_slugs = {
            item.slug for item in constituencies.data if item.entity_type == "assembly_constituency"
        }
        assert constituency_slugs == {"ichchapuram", "palasa", "rayadurg"}

        by_slug = {item.slug: item for item in representatives.data}
        bendalam = by_slug["sri-ashok-bendalam"]
        assert bendalam.valid_from is not None
        assert bendalam.valid_from.isoformat() == "2024-06-06"
        assert bendalam.provenance.review_status.value == "reviewed"

        assert session.scalar(select(func.count()).select_from(Representative)) == 3
        assert session.scalar(select(func.count()).select_from(PublicOffice)) == 3
        assert session.scalar(select(func.count()).select_from(OfficeJurisdiction)) == 3
        assert session.scalar(select(func.count()).select_from(OfficialRole)) == 1
        assert session.scalar(select(func.count()).select_from(RepresentativeTerm)) == 3
        assert (
            session.scalar(
                select(func.count())
                .select_from(GovernmentBody)
                .where(GovernmentBody.slug == "andhra-pradesh-legislative-assembly")
            )
            == 1
        )
        assert (
            session.scalar(
                select(func.count())
                .select_from(Geography)
                .where(Geography.entity_type == "assembly_constituency")
            )
            == 3
        )
        assert (
            session.scalar(
                select(func.count())
                .select_from(GeographyRelationship)
                .where(
                    GeographyRelationship.relationship_type == "electoral_contains"
                )
            )
            == 3
        )

    with Session(engine) as session, session.begin():
        rerun = store_representatives(session, reviewer_identity="integration:representatives")

    assert rerun.government_bodies_created == 0
    assert rerun.official_roles_created == 0
    assert rerun.representatives_created == 0
    assert rerun.representative_terms_created == 0
    assert rerun.public_offices_created == 0
    assert rerun.office_jurisdictions_created == 0
    assert rerun.geographies_created == 0
    assert rerun.geography_relationships_created == 0

    with Session(engine) as session:
        assert session.scalar(select(func.count()).select_from(Representative)) == 3
    engine.dispose()