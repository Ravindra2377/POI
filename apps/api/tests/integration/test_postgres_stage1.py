import os
from pathlib import Path

import pytest
from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import Session

from alembic import command
from alembic.config import Config
from app.db import normalize_database_url
from app.models.enums import GeographyType, GovernmentBodyType
from app.models.geography import Geography
from app.models.source import SourceReference
from app.repositories import SQLCatalogRepository
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


def test_empty_database_migration_and_seed_are_idempotent() -> None:
    assert TEST_DATABASE_URL is not None
    assert "_test" in TEST_DATABASE_URL, "integration tests require a dedicated test database"

    config = _alembic_config()
    command.downgrade(config, "base")
    command.upgrade(config, "head")
    command.upgrade(config, "head")

    engine = create_engine(normalize_database_url(TEST_DATABASE_URL))
    with Session(engine) as session:
        with session.begin():
            first = seed_stage1(session)
        with session.begin():
            second = seed_stage1(session)

        assert first.geographies_created == 27
        assert second.geographies_created == 0
        assert second.sources_created == 0
        assert session.scalar(select(func.count()).select_from(Geography)) == 27
        assert session.scalar(select(func.count()).select_from(SourceReference)) == 28
        assert all(item.source_id for item in session.scalars(select(Geography)))

        catalog = SQLCatalogRepository(session)
        districts = catalog.list_geographies(
            entity_type=GeographyType.DISTRICT,
            parent=None,
            active_on=None,
            query=None,
            page=1,
            page_size=100,
        )
        alias_results = catalog.list_geographies(
            entity_type=None,
            parent=None,
            active_on=None,
            query="Vizag",
            page=1,
            page_size=100,
        )
        telugu_results = catalog.list_geographies(
            entity_type=None,
            parent=None,
            active_on=None,
            query="విశాఖపట్నం",
            page=1,
            page_size=100,
        )
        departments = catalog.list_government_bodies(
            body_type=GovernmentBodyType.DEPARTMENT,
            parent=None,
            active_on=None,
            query=None,
            page=1,
            page_size=100,
        )

        assert districts.meta.total == 26
        assert [item.slug for item in alias_results.data] == ["visakhapatnam"]
        assert [item.slug for item in telugu_results.data] == ["visakhapatnam"]
        assert departments.meta.total == 3
