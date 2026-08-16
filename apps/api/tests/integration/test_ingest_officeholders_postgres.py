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
from app.models.provenance import SourceObservation, SourceSnapshot
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


def test_officeholder_feed_ingestion_publishes_term16_members(tmp_path: Path) -> None:
    engine = _prepare_database()
    now = datetime.now(UTC)

    with Session(engine) as session, session.begin():
        records = parse_officeholders(TERM16_REPORT, term_id=16)
        assert len(records) == 3

        stored = store_officeholders_feed(session, tmp_path, _snapshot(now), records)
        reviewed = review_officeholders_observations(
            session,
            extraction_run_id=stored.extraction_run_id,
            reviewer_identity="integration:officeholder-feed",
            decided_at=now,
        )

        assert stored.snapshots_stored == 1
        assert stored.observations_created > 0
        assert reviewed == stored.observations_created
        assert (tmp_path / "snapshots" / f"{stored.sha256}.html").exists()

        assert session.scalar(select(func.count()).select_from(SourceSnapshot)) == 1

        catalog = SQLCatalogRepository(session)
        officeholders = catalog.list_officeholders()
        assert officeholders.status == "reviewed"
        assert officeholders.telugu_reviewed is False
        assert len(officeholders.data) == 3
        by_slug = {item.slug: item for item in officeholders.data}
        ichchapuram = by_slug["term16-3107-ichchapuram"]
        assert ichchapuram.person_name.value.en == "SRI ASHOK BENDALAM"
        assert ichchapuram.person_name.value.te == ""
        assert ichchapuram.office_title.value.en == "Member of Legislative Assembly"
        assert ichchapuram.government_body.value.en == "Andhra Pradesh Legislative Assembly"
        assert [district.en for district in ichchapuram.districts.value] == ["SRIKAKULAM"]
        assert ichchapuram.constituency.value.en == "ICHCHAPURAM"
        assert ichchapuram.term_period.value.en == "Term XVI (constituted 06.06.2024)"
        assert ichchapuram.party is not None
        assert ichchapuram.party.value.en == "TDP"
        assert ichchapuram.person_name.source.source_name.startswith(
            "AP Legislative Assembly member report"
        )
        assert ichchapuram.person_name.source.official_source_url.host == "aplegislature.org"
        assert ichchapuram.person_name.source.public_source_url == "https://aplegislature.org"
        assert ichchapuram.person_name.source.review_status.value == "reviewed"

        published_observations = session.scalar(
            select(func.count())
            .select_from(SourceObservation)
            .where(SourceObservation.is_published.is_(True))
        )
        assert published_observations == stored.observations_created

    with Session(engine) as session, session.begin():
        records = parse_officeholders(TERM16_REPORT, term_id=16)
        rerun = store_officeholders_feed(session, tmp_path, _snapshot(now), records)
        assert rerun.snapshots_stored == 0
        assert rerun.observations_created == 0

    with Session(engine) as session:
        assert session.scalar(select(func.count()).select_from(SourceSnapshot)) == 1
    engine.dispose()
