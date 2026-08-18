import json
import os
from collections.abc import Iterator
from datetime import UTC, datetime
from pathlib import Path

import pytest
from sqlalchemy import Engine, create_engine, func, select
from sqlalchemy.orm import Session

from alembic import command
from alembic.config import Config
from app.commands.seed_all_states import seed_states_and_uts
from app.db import normalize_database_url
from app.ingestion.all_states import ALL_INDIA_STATES_UTS
from app.ingestion.districts import (
    DistrictFeedRecord,
    FeedSnapshot,
    ingest_state_districts,
    parse_lgd_districts,
    publish_district_geographies,
    review_feed_observations,
    store_state_district_feed,
)
from app.models.enums import GeographyType, LanguageCode
from app.models.geography import Geography, GeographyAlias
from app.models.provenance import SourceRecord, SourceSnapshot
from app.repositories import SQLCatalogRepository
from app.seeds import seed_stage1

TEST_DATABASE_URL = os.getenv("TEST_DATABASE_URL")
pytestmark = pytest.mark.skipif(
    not TEST_DATABASE_URL,
    reason="TEST_DATABASE_URL is required for PostgreSQL/PostGIS integration tests",
)

KA_PAYLOAD = json.dumps(
    [
        {
            "districtCode": 601,
            "districtNameEnglish": "Bengaluru Urban",
            "districtNameLocal": "ಬೆಂಗಳೂರು ನಗರ",
        },
        {
            "districtCode": 602,
            "districtNameEnglish": "Belagavi",
            "districtNameLocal": "ಬೆಳಗಾವಿ",
        },
    ]
).encode("utf-8")

_WIDE_LANGUAGE_TABLES = (
    "geography_aliases",
    "government_body_aliases",
    "public_office_aliases",
    "source_documents",
)


@pytest.fixture(autouse=True)
def _remove_wide_language_rows_after_module() -> Iterator[None]:
    # These tests seed native-language aliases (e.g. Kannada). Migration
    # 20260817_0005's downgrade cannot restore the narrow en/te/und
    # constraint while such rows exist, so leave the shared test database
    # in a downgrade-compatible state once this module has finished.
    yield
    if not TEST_DATABASE_URL:
        return
    with create_engine(normalize_database_url(TEST_DATABASE_URL)).begin() as conn:
        for table in _WIDE_LANGUAGE_TABLES:
            conn.exec_driver_sql(
                f"DELETE FROM {table} WHERE language_code NOT IN ('en', 'te', 'und')"
            )


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
    command.upgrade(config, "head")
    engine = create_engine(normalize_database_url(TEST_DATABASE_URL))
    with Session(engine) as session, session.begin():
        seed_stage1(session)
        seed_states_and_uts(session)
    return engine


def _ka_snapshot(retrieved_at: datetime) -> FeedSnapshot:
    return FeedSnapshot(
        key="lgd-district-list-29",
        name="Local Government Directory district list (LGD state code 29)",
        publisher="Local Government Directory (LGD)",
        url="https://lgdirectory.gov.in/webservices/lgdws/districtList",
        public_url="https://lgdirectory.gov.in/",
        request_method="POST",
        request_body="stateCode=29",
        content_type="application/json",
        raw=KA_PAYLOAD,
        retrieved_at=retrieved_at,
    )


def _ka_records() -> list[DistrictFeedRecord]:
    return parse_lgd_districts(KA_PAYLOAD)


def test_seed_states_geographies_and_district_ingestion_for_karnataka(tmp_path: Path) -> None:
    engine = _prepare_database()
    now = datetime.now(UTC)
    records = _ka_records()
    assert len(records) == 2

    with Session(engine) as session, session.begin():
        assert session.scalar(
            select(func.count())
            .select_from(Geography)
            .where(Geography.entity_type == GeographyType.STATE)
        ) == 36

        karnataka = session.scalar(
            select(Geography).where(
                Geography.entity_type == GeographyType.STATE,
                Geography.official_code == "29",
            )
        )
        assert karnataka is not None
        assert karnataka.slug == "in-ka"
        assert karnataka.name_en == "Karnataka"
        assert karnataka.official_code_scheme == "LGD state code"
        alias = session.scalar(
            select(GeographyAlias).where(GeographyAlias.geography_id == karnataka.id)
        )
        assert alias is not None
        assert alias.language_code == LanguageCode.KN
        assert alias.alias == "ಕರ್ನಾಟಕ"

        stored = store_state_district_feed(
            session,
            tmp_path,
            snapshot=_ka_snapshot(now),
            records=records,
            jurisdiction_code="IN-KA",
        )
        reviewed = review_feed_observations(
            session,
            extraction_run_ids=stored.extraction_run_ids,
            reviewer_identity="integration:state-districts",
            decided_at=now,
        )
        published = publish_district_geographies(
            session,
            state_iso="IN-KA",
            lgd_code="29",
            native_language="kn",
            lgd_records=records,
            valid_from=now.date(),
            reviewer_identity="integration:state-districts",
            decided_at=now,
            snapshot_sha256=stored.lgd_sha256,
            lgd_extraction_run_id=stored.lgd_extraction_run_id,
        )

        assert stored.snapshots_stored == 1
        assert stored.observations_created > 0
        assert reviewed == stored.observations_created
        assert published == 2
        assert (tmp_path / "snapshots" / f"{stored.lgd_sha256}.json").exists()

        ka_source = session.scalar(
            select(SourceRecord).where(
                SourceRecord.jurisdiction_code == "IN-KA",
                SourceRecord.source_type == "api_endpoint",
            )
        )
        assert ka_source is not None
        assert ka_source.source_type == "api_endpoint"

        districts = session.scalars(
            select(Geography).where(
                Geography.entity_type == GeographyType.DISTRICT,
                Geography.parent_id == karnataka.id,
            )
        ).all()
        assert len(districts) == 2
        by_code = {item.official_code: item for item in districts}
        assert by_code["601"].name_en == "Bengaluru Urban"
        assert by_code["602"].name_en == "Belagavi"

        bengaluru_alias = session.scalar(
            select(GeographyAlias).where(GeographyAlias.geography_id == by_code["601"].id)
        )
        assert bengaluru_alias is not None
        assert bengaluru_alias.language_code == LanguageCode.KN
        assert bengaluru_alias.alias == "ಬೆಂಗಳೂರು ನಗರ"

        catalog = SQLCatalogRepository(session)
        children = catalog.list_children(identifier="in-ka", page=1, page_size=100)
        assert children.meta.total == 2
        assert {item.name_en for item in children.data} == {"Bengaluru Urban", "Belagavi"}

    with Session(engine) as session, session.begin():
        rerun = store_state_district_feed(
            session,
            tmp_path,
            snapshot=_ka_snapshot(now),
            records=records,
            jurisdiction_code="IN-KA",
        )
        assert rerun.snapshots_stored == 0
        assert rerun.observations_created == 0
        republished = publish_district_geographies(
            session,
            state_iso="IN-KA",
            lgd_code="29",
            native_language="kn",
            lgd_records=records,
            valid_from=now.date(),
            reviewer_identity="integration:state-districts",
            decided_at=now,
            snapshot_sha256=rerun.lgd_sha256,
            lgd_extraction_run_id=rerun.lgd_extraction_run_id,
        )
        assert republished == 0

    with Session(engine) as session:
        assert session.scalar(
            select(func.count())
            .select_from(Geography)
            .where(Geography.entity_type == GeographyType.DISTRICT)
        ) == 26 + 2
    engine.dispose()


def test_ingest_state_districts_end_to_end(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    engine = _prepare_database()
    now = datetime.now(UTC)
    karnataka = next(state for state in ALL_INDIA_STATES_UTS if state.iso_code == "IN-KA")

    monkeypatch.setattr(
        "app.ingestion.districts.fetch_lgd_district_feed",
        lambda lgd_code, timeout=25.0: _ka_snapshot(now),
    )

    with Session(engine) as session, session.begin():
        result = ingest_state_districts(
            session,
            tmp_path,
            state=karnataka,
            reviewer_identity="integration:state-districts",
            decided_at=now,
            valid_from=now.date(),
        )

        assert result.state_iso == "IN-KA"
        assert result.districts_seen == 2
        assert result.snapshots_stored == 1
        assert result.observations_created > 0
        assert result.observations_reviewed == result.observations_created
        assert result.geographies_published == 2

        karnataka_geo = session.scalar(
            select(Geography).where(
                Geography.entity_type == GeographyType.STATE,
                Geography.official_code == "29",
            )
        )
        assert karnataka_geo is not None
        assert session.scalar(
            select(func.count())
            .select_from(SourceSnapshot)
            .where(SourceSnapshot.document_id.isnot(None))
        ) == 1

    with Session(engine) as session:
        assert session.scalar(
            select(func.count())
            .select_from(Geography)
            .where(Geography.entity_type == GeographyType.DISTRICT)
        ) == 26 + 2
    engine.dispose()


def test_empty_local_name_uses_english_rendering_without_native_alias(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    engine = _prepare_database()
    now = datetime.now(UTC)
    jammu_kashmir = next(
        state for state in ALL_INDIA_STATES_UTS if state.iso_code == "IN-JK"
    )
    jk_payload = json.dumps(
        [
            {
                "districtCode": 2,
                "districtNameEnglish": "Budgam",
                "districtNameLocal": "",
            },
            {
                "districtCode": 5,
                "districtNameEnglish": "Jammu",
                "districtNameLocal": "JAMMU",
            },
        ]
    ).encode("utf-8")

    def jk_snapshot(lgd_code: str, timeout: float = 25.0) -> FeedSnapshot:
        return FeedSnapshot(
            key=f"lgd-district-list-{lgd_code}",
            name=f"Local Government Directory district list (LGD state code {lgd_code})",
            publisher="Local Government Directory (LGD)",
            url="https://lgdirectory.gov.in/webservices/lgdws/districtList",
            public_url="https://lgdirectory.gov.in/",
            request_method="POST",
            request_body=f"stateCode={lgd_code}",
            content_type="application/json",
            raw=jk_payload,
            retrieved_at=now,
        )

    monkeypatch.setattr(
        "app.ingestion.districts.fetch_lgd_district_feed",
        jk_snapshot,
    )

    with Session(engine) as session, session.begin():
        records = parse_lgd_districts(jk_payload)
        assert records[0].name_local == "Budgam"

        result = ingest_state_districts(
            session,
            tmp_path,
            state=jammu_kashmir,
            reviewer_identity="integration:state-districts",
            decided_at=now,
            valid_from=now.date(),
        )

        assert result.districts_seen == 2
        assert result.geographies_published == 2

        state = session.scalar(
            select(Geography).where(
                Geography.entity_type == GeographyType.STATE,
                Geography.official_code == "1",
            )
        )
        assert state is not None

        districts = session.scalars(
            select(Geography).where(
                Geography.entity_type == GeographyType.DISTRICT,
                Geography.parent_id == state.id,
            )
        ).all()
        assert len(districts) == 2
        by_code = {item.official_code: item for item in districts}
        assert by_code["2"].name_en == "Budgam"
        assert by_code["5"].name_en == "Jammu"

        budgam_aliases = session.scalars(
            select(GeographyAlias).where(GeographyAlias.geography_id == by_code["2"].id)
        ).all()
        assert budgam_aliases == []

        jammu_aliases = session.scalars(
            select(GeographyAlias).where(GeographyAlias.geography_id == by_code["5"].id)
        ).all()
        assert [alias.alias for alias in jammu_aliases] == ["JAMMU"]

    engine.dispose()
