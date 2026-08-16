import os
from datetime import UTC, datetime
from pathlib import Path

import pytest
from sqlalchemy import Engine, create_engine, func, select
from sqlalchemy.orm import Session

from alembic import command
from alembic.config import Config
from app.db import normalize_database_url
from app.ingestion.budget import (
    BudgetSnapshot,
    BudgetStoreResult,
    parse_afs_layout,
    review_budget_observations,
    store_budget_afs,
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
LAYOUT_SNIPPET = (FIXTURES / "ap_afs_layout_snippet.txt").read_bytes()


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


def _snapshot(retrieved_at: datetime) -> BudgetSnapshot:
    return BudgetSnapshot(
        key="ap-afs-2022-23",
        name="Annual Financial Statement 2022-23 (Volume-I-1)",
        publisher="Government of Andhra Pradesh Finance Department",
        url="https://apfinance.gov.in/budget-volumes/2022-23/afs-2022-23-v-1-1.pdf",
        public_url="https://apfinance.gov.in/budget.html",
        request_method="GET",
        request_body=None,
        content_type="application/pdf",
        raw=LAYOUT_SNIPPET,
        retrieved_at=retrieved_at,
    )


def test_budget_afs_ingestion_publishes_major_heads(tmp_path: Path) -> None:
    engine = _prepare_database()
    now = datetime.now(UTC)

    with Session(engine) as session, session.begin():
        layout = LAYOUT_SNIPPET.decode("utf-8", errors="replace")
        lines = parse_afs_layout(layout, fiscal_year="2022-23")
        assert len(lines) > 0

        stored: BudgetStoreResult = store_budget_afs(
            session, tmp_path, _snapshot(now), lines
        )
        reviewed = review_budget_observations(
            session,
            extraction_run_id=stored.extraction_run_id,
            reviewer_identity="integration:ap-afs",
            decided_at=now,
        )

        assert stored.snapshots_stored == 1
        assert stored.observations_created > 0
        assert reviewed == stored.observations_created
        assert (tmp_path / "snapshots" / f"{stored.sha256}.pdf").exists()

        assert session.scalar(select(func.count()).select_from(SourceSnapshot)) == 1

        catalog = SQLCatalogRepository(session)
        budget = catalog.list_budget()
        assert budget.status == "reviewed"
        assert len(budget.data) >= len(lines)
        line = next(item for item in budget.data if item.code == "0049")
        assert line.statement == "revenue_receipts"
        assert line.name.value.en == "Interest Receipts"
        assert line.amounts[0].value_text == "9625,53,80"
        assert line.amounts[0].rupees == 96255380000
        assert line.source.source_name.startswith("Annual Financial Statement")
        assert line.source.official_source_url.host == "apfinance.gov.in"
        assert str(line.source.public_source_url) == "https://apfinance.gov.in/budget.html"
        assert line.source.review_status.value == "reviewed"

        published_observations = session.scalar(
            select(func.count())
            .select_from(SourceObservation)
            .where(SourceObservation.is_published.is_(True))
        )
        assert published_observations == 28 + stored.observations_created

    with Session(engine) as session, session.begin():
        lines = parse_afs_layout(
            LAYOUT_SNIPPET.decode("utf-8", errors="replace"), fiscal_year="2022-23"
        )
        rerun = store_budget_afs(session, tmp_path, _snapshot(now), lines)
        assert rerun.snapshots_stored == 0
        assert rerun.observations_created == 0

    with Session(engine) as session:
        assert session.scalar(select(func.count()).select_from(SourceSnapshot)) == 1
    engine.dispose()