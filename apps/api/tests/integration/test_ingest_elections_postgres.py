import os
from datetime import UTC, datetime
from pathlib import Path

import pytest
from sqlalchemy import Engine, create_engine, func, select
from sqlalchemy.orm import Session

from alembic import command
from alembic.config import Config
from app.db import normalize_database_url
from app.ingestion.elections import (
    ElectionFeedSnapshot,
    build_election_snapshot,
    parse_election_results,
    review_election_observations,
    store_election_results,
)
from app.models.provenance import SourceObservation, SourceSnapshot
from app.seeds import seed_stage1

TEST_DATABASE_URL = os.getenv("TEST_DATABASE_URL")
pytestmark = pytest.mark.skipif(
    not TEST_DATABASE_URL,
    reason="TEST_DATABASE_URL is required for PostgreSQL/PostGIS integration tests",
)

FIXTURES = Path(__file__).parents[1] / "fixtures"
TERM16_TEXT = (FIXTURES / "ap_legislature_members_term16.txt").read_text()
TERM16_PDF = (FIXTURES / "term16.pdf").read_bytes()


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


def _snapshot(retrieved_at: datetime) -> ElectionFeedSnapshot:
    return build_election_snapshot(
        TERM16_PDF,
        term_id=16,
        file_name="term16.pdf",
    )


def test_election_feed_ingestion_publishes_term16_results(tmp_path: Path) -> None:
    engine = _prepare_database()
    now = datetime.now(UTC)

    with Session(engine) as session, session.begin():
        records = parse_election_results(TERM16_TEXT, term_id=16)
        assert len(records) == 175

        snapshot = _snapshot(now)
        stored = store_election_results(session, tmp_path, snapshot, records)
        reviewed = review_election_observations(
            session,
            extraction_run_id=stored.extraction_run_id,
            reviewer_identity="integration:election-results",
            decided_at=now,
        )

        assert stored.snapshots_stored == 1
        assert stored.observations_created == 175 * 13
        assert reviewed == stored.observations_created
        assert (tmp_path / "snapshots" / f"{stored.sha256}.pdf").exists()

        assert session.scalar(select(func.count()).select_from(SourceSnapshot)) == 1

        ichchapuram = session.scalar(
            select(SourceObservation).where(
                SourceObservation.entity_type == "election_result",
                SourceObservation.entity_id.like("%-1-ichchapuram"),
                SourceObservation.field_path == "constituency_en",
            )
        )
        assert ichchapuram is not None
        assert ichchapuram.value_text == "Ichchapuram"
        assert ichchapuram.classification.value == "official"
        assert ichchapuram.review_state.value == "reviewed"
        assert ichchapuram.is_published is True
        snapshot_row = session.get(SourceSnapshot, ichchapuram.snapshot_id)
        assert snapshot_row is not None
        assert snapshot_row.retrieval_metadata["file_name"] == "term16.pdf"

        kovur = session.scalar(
            select(SourceObservation).where(
                SourceObservation.entity_type == "election_result",
                SourceObservation.entity_id.like("%-kovur"),
                SourceObservation.field_path == "constituency_no",
            )
        )
        assert kovur is not None
        assert kovur.value_text == ""

        published_observations = session.scalar(
            select(func.count())
            .select_from(SourceObservation)
            .where(SourceObservation.is_published.is_(True))
        )
        assert published_observations == stored.observations_created

    with Session(engine) as session, session.begin():
        records = parse_election_results(TERM16_TEXT, term_id=16)
        rerun = store_election_results(session, tmp_path, _snapshot(now), records)
        assert rerun.snapshots_stored == 0
        assert rerun.observations_created == 0

    with Session(engine) as session:
        assert session.scalar(select(func.count()).select_from(SourceSnapshot)) == 1
    engine.dispose()
