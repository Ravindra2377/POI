import os
from pathlib import Path

import pytest
from sqlalchemy import Engine, create_engine, func, select
from sqlalchemy.orm import Session

from alembic import command
from alembic.config import Config
from app.db import normalize_database_url
from app.models.enums import ObservationReviewState
from app.models.provenance import SourceObservation
from app.seeds import seed_stage1

TEST_DATABASE_URL = os.getenv("TEST_DATABASE_URL")
pytestmark = pytest.mark.skipif(
    not TEST_DATABASE_URL,
    reason="TEST_DATABASE_URL is required for PostgreSQL/PostGIS integration tests",
)


def _alembic_config() -> Config:
    config = Config(str(Path(__file__).parents[2] / "alembic.ini"))
    assert TEST_DATABASE_URL is not None
    config.set_main_option("sqlalchemy.url", normalize_database_url(TEST_DATABASE_URL))
    return config


def _prepare_head_database() -> Engine:
    assert TEST_DATABASE_URL is not None
    assert "_test" in TEST_DATABASE_URL, "integration tests require a dedicated test database"
    command.downgrade(_alembic_config(), "base")
    command.upgrade(_alembic_config(), "head")
    return create_engine(normalize_database_url(TEST_DATABASE_URL))


def test_seed_on_head_migrated_database_publishes_28_source_references() -> None:
    engine = _prepare_head_database()
    with Session(engine) as session, session.begin():
        first = seed_stage1(session)
        assert first.sources_created == 28
        assert first.geographies_created == 27
        published = session.scalars(
            select(SourceObservation).where(SourceObservation.is_published.is_(True))
        ).all()
        assert len(published) == 28
        assert all(
            observation.review_state == ObservationReviewState.REVIEWED
            for observation in published
        )

        second = seed_stage1(session)
        assert second.sources_created == 0
        assert second.geographies_created == 0

        total = session.scalar(select(func.count()).select_from(SourceObservation))
        assert total == 28
