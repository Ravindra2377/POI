"""PostgreSQL integration tests for the claims-vs-records comparison engine."""

import os
from datetime import UTC, datetime
from decimal import Decimal
from pathlib import Path

import pytest
from sqlalchemy import Engine, create_engine, func, select
from sqlalchemy.orm import Session

from alembic import command
from alembic.config import Config
from app.db import normalize_database_url
from app.ingestion.budget import (
    BudgetSnapshot,
    parse_afs_layout,
    review_budget_observations,
    store_budget_afs,
)
from app.ingestion.comparisons import build_budget_comparisons, list_published_comparisons
from app.models.comparison import ClaimRecordComparison
from app.models.enums import ComparisonVerdict
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


def test_comparisons_built_and_published_from_reviewed_budget(tmp_path: Path) -> None:
    engine = _prepare_database()
    now = datetime.now(UTC)

    with Session(engine) as session, session.begin():
        layout = LAYOUT_SNIPPET.decode("utf-8", errors="replace")
        lines = parse_afs_layout(layout, fiscal_year="2022-23")
        assert len(lines) > 0
        stored = store_budget_afs(session, tmp_path, _snapshot(now), lines)
        review_budget_observations(
            session,
            extraction_run_id=stored.extraction_run_id,
            reviewer_identity="integration:ap-afs",
            decided_at=now,
        )

    with Session(engine) as session, session.begin():
        summary = build_budget_comparisons(
            session,
            reviewer_identity="integration-operator",
            decided_at=now,
            tolerance_percent=Decimal("5.00"),
        )
        assert summary["created"] > 0
        assert summary["skipped"] >= 0
        assert summary["updated"] == 0

    with Session(engine) as session:
        published = list_published_comparisons(session)
        assert len(published) > 0
        for comparison in published:
            assert comparison.is_published is True
            assert comparison.review_state == "reviewed"
            assert comparison.reviewer_identity == "integration-operator"
            assert comparison.claim_observation_id is not None
            assert comparison.record_observation_id is not None
            assert comparison.verdict in {
                ComparisonVerdict.CONSISTENT.value,
                ComparisonVerdict.DIVERGENT.value,
            }

    with Session(engine) as session, session.begin():
        rerun = build_budget_comparisons(
            session,
            reviewer_identity="integration-operator",
            decided_at=now,
            tolerance_percent=Decimal("5.00"),
        )
        assert rerun["created"] == 0
        assert rerun["updated"] == summary["created"]

    with Session(engine) as session:
        count = session.scalar(
            select(func.count()).select_from(ClaimRecordComparison)
        )
        assert count == summary["created"]