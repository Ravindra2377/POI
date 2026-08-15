import os
from datetime import UTC, datetime
from pathlib import Path

import pytest
from sqlalchemy import Engine, create_engine, func, select
from sqlalchemy.orm import Session

from alembic import command
from alembic.config import Config
from app.db import normalize_database_url
from app.ingestion.schemes import (
    FeedSnapshot,
    parse_ap_schemes,
    review_scheme_observations,
    store_scheme_feed,
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
SCHEME_PAYLOAD = (FIXTURES / "myscheme_ap_schemes_live.json").read_bytes()


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
        key="myscheme-ap-schemes",
        name="myScheme Andhra Pradesh state scheme search",
        publisher="myScheme (Govt. of India, MeitY)",
        url=(
            "https://api.myscheme.gov.in/search/v3/schemes?lang=en"
            "&q=%5B%7B%22identifier%22%3A%22beneficiaryState%22%2C%22value%22"
            "%3A%22Andhra+Pradesh%22%7D%5D&keyword=&sort=multiple_sort&from=0&size=100"
        ),
        public_url="https://www.myscheme.gov.in/search/state/Andhra Pradesh",
        request_method="GET",
        request_body=None,
        content_type="application/json",
        raw=SCHEME_PAYLOAD,
        retrieved_at=retrieved_at,
    )


def test_scheme_feed_ingestion_publishes_all_20_schemes(tmp_path: Path) -> None:
    engine = _prepare_database()
    now = datetime.now(UTC)

    with Session(engine) as session, session.begin():
        records = parse_ap_schemes(SCHEME_PAYLOAD)
        assert len(records) == 20

        stored = store_scheme_feed(session, tmp_path, _snapshot(now), records)
        reviewed = review_scheme_observations(
            session,
            extraction_run_id=stored.extraction_run_id,
            reviewer_identity="integration:scheme-feed",
            decided_at=now,
        )

        assert stored.snapshots_stored == 1
        assert stored.observations_created > 0
        assert reviewed == stored.observations_created
        assert (tmp_path / "snapshots" / f"{stored.sha256}.json").exists()

        assert session.scalar(select(func.count()).select_from(SourceSnapshot)) == 1

        catalog = SQLCatalogRepository(session)
        schemes = catalog.list_schemes()
        assert schemes.status == "reviewed"
        assert schemes.telugu_reviewed is False
        assert len(schemes.data) == 20
        slugs = {item.slug for item in schemes.data}
        assert {"ysrrb", "jav", "dysrhis", "pi", "jc"} <= slugs
        rythu = next(item for item in schemes.data if item.slug == "ysrrb")
        assert rythu.name.value.en == "YSR Rythu Bharosa"
        assert rythu.name.value.te == ""
        assert rythu.category.value.en == "Agriculture,Rural & Environment"
        assert rythu.department is None
        assert rythu.districts is None
        assert rythu.eligibility is None
        assert rythu.name.source.source_name.startswith("myScheme")
        assert rythu.name.source.official_source_url.host == "api.myscheme.gov.in"
        assert rythu.name.source.public_source_url == (
            "https://www.myscheme.gov.in/search/state/Andhra Pradesh"
        )
        assert rythu.name.source.review_status.value == "reviewed"

        published_observations = session.scalar(
            select(func.count())
            .select_from(SourceObservation)
            .where(SourceObservation.is_published.is_(True))
        )
        assert published_observations == stored.observations_created

    with Session(engine) as session, session.begin():
        records = parse_ap_schemes(SCHEME_PAYLOAD)
        rerun = store_scheme_feed(session, tmp_path, _snapshot(now), records)
        assert rerun.snapshots_stored == 0
        assert rerun.observations_created == 0

    with Session(engine) as session:
        assert session.scalar(select(func.count()).select_from(SourceSnapshot)) == 1
    engine.dispose()