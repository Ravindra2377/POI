import os
from datetime import UTC, datetime
from pathlib import Path

import pytest
from sqlalchemy import Engine, create_engine, func, select
from sqlalchemy.orm import Session

from alembic import command
from alembic.config import Config
from app.db import normalize_database_url
from app.ingestion.districts import (
    FeedSnapshot,
    attach_portal_codes,
    parse_ap_portal_codes,
    parse_lgd_districts,
    publish_deferred_districts,
    review_feed_observations,
    store_district_feed,
)
from app.models.enums import GeographyType
from app.models.geography import Geography
from app.models.provenance import SourceObservation, SourceSnapshot
from app.repositories import SQLCatalogRepository
from app.seeds import seed_stage1

TEST_DATABASE_URL = os.getenv("TEST_DATABASE_URL")
pytestmark = pytest.mark.skipif(
    not TEST_DATABASE_URL,
    reason="TEST_DATABASE_URL is required for PostgreSQL/PostGIS integration tests",
)

FIXTURES = Path(__file__).parents[1] / "fixtures"
LGD_PAYLOAD = (FIXTURES / "lgd_districts_live.json").read_bytes()
AP_PAYLOAD = (FIXTURES / "ap_districts_live.json").read_bytes()


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


def _lgd_snapshot(retrieved_at: datetime) -> FeedSnapshot:
    return FeedSnapshot(
        key="lgd-district-list",
        name="Local Government Directory district list",
        publisher="Local Government Directory (LGD)",
        url="https://lgdirectory.gov.in/webservices/lgdws/districtList",
        request_method="POST",
        request_body="stateCode=28",
        content_type="application/json",
        raw=LGD_PAYLOAD,
        retrieved_at=retrieved_at,
    )


def _ap_snapshot(retrieved_at: datetime) -> FeedSnapshot:
    return FeedSnapshot(
        key="ap-portal-districts",
        name="Andhra Pradesh State Portal district directory",
        publisher="Andhra Pradesh State Portal",
        url="https://www.ap.gov.in/api/api/Districts",
        request_method="GET",
        request_body=None,
        content_type="application/json",
        raw=AP_PAYLOAD,
        retrieved_at=retrieved_at,
    )


def test_district_feed_ingestion_publishes_all_28_districts(tmp_path: Path) -> None:
    engine = _prepare_database()
    now = datetime.now(UTC)

    with Session(engine) as session, session.begin():
        portal_codes = parse_ap_portal_codes(AP_PAYLOAD)
        lgd_records = attach_portal_codes(parse_lgd_districts(LGD_PAYLOAD), portal_codes)
        assert len(lgd_records) == 28

        stored = store_district_feed(
            session,
            tmp_path,
            _lgd_snapshot(now),
            _ap_snapshot(now),
            lgd_records,
            portal_codes,
        )
        reviewed = review_feed_observations(
            session,
            extraction_run_ids=stored.extraction_run_ids,
            reviewer_identity="integration:district-feed",
            decided_at=now,
        )
        published = publish_deferred_districts(
            session,
            reviewer_identity="integration:district-feed",
            decided_at=now,
            snapshot_sha256=stored.lgd_sha256,
            lgd_extraction_run_id=stored.lgd_extraction_run_id,
            valid_from=now.date(),
        )

        assert stored.snapshots_stored == 2
        assert stored.observations_created > 0
        assert reviewed == stored.observations_created
        assert published == 2
        assert (tmp_path / "snapshots" / f"{stored.lgd_sha256}.json").exists()

        assert session.scalar(select(func.count()).select_from(Geography)) == 29
        assert session.scalar(
            select(func.count()).select_from(SourceSnapshot)
        ) == 2

        catalog = SQLCatalogRepository(session)
        districts = catalog.list_geographies(
            entity_type=GeographyType.DISTRICT,
            parent=None,
            active_on=None,
            query=None,
            page=1,
            page_size=100,
        )
        slugs = {item.slug for item in districts.data}
        assert districts.meta.total == 28
        assert {"markapuram", "polavaram"} <= slugs
        markapuram = next(item for item in districts.data if item.slug == "markapuram")
        assert markapuram.official_code == "790"
        assert markapuram.provenance.review_status.value == "reviewed"
        assert markapuram.provenance.official_source_url == (
            "https://lgdirectory.gov.in/webservices/lgdws/districtList"
        )
        assert not markapuram.has_boundary

        published_observations = session.scalar(
            select(func.count())
            .select_from(SourceObservation)
            .where(SourceObservation.is_published.is_(True))
        )
        assert published_observations == 28 + stored.observations_created + 2

    with Session(engine) as session, session.begin():
        portal_codes = parse_ap_portal_codes(AP_PAYLOAD)
        lgd_records = attach_portal_codes(parse_lgd_districts(LGD_PAYLOAD), portal_codes)
        rerun = store_district_feed(
            session,
            tmp_path,
            _lgd_snapshot(now),
            _ap_snapshot(now),
            lgd_records,
            portal_codes,
        )
        assert rerun.snapshots_stored == 0
        assert rerun.observations_created == 0
        republished = publish_deferred_districts(
            session,
            reviewer_identity="integration:district-feed",
            decided_at=now,
            snapshot_sha256=rerun.lgd_sha256,
            lgd_extraction_run_id=rerun.lgd_extraction_run_id,
            valid_from=now.date(),
        )
        assert republished == 0

    with Session(engine) as session:
        assert session.scalar(select(func.count()).select_from(Geography)) == 29
    engine.dispose()
