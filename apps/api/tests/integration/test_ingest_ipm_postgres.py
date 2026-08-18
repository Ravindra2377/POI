"""PostgreSQL integration tests for the MoSPI IPM dashboard ingestion."""

import os
from collections.abc import Iterator
from datetime import UTC, datetime
from decimal import Decimal
from pathlib import Path

import pytest
from sqlalchemy import Engine, create_engine, func, select
from sqlalchemy.orm import Session

from alembic import command
from alembic.config import Config
from app.commands.seed_all_states import seed_states_and_uts
from app.db import normalize_database_url
from app.ingestion.comparisons import build_ipm_comparisons, list_published_comparisons
from app.ingestion.ipm import (
    IpmSnapshot,
    parse_ipm_dashboard,
    review_ipm_observations,
    store_ipm_dashboard,
)
from app.models.comparison import ClaimRecordComparison
from app.models.enums import ComparisonKind
from app.models.provenance import SourceObservation, SourceSnapshot
from app.seeds import seed_stage1

TEST_DATABASE_URL = os.getenv("TEST_DATABASE_URL")
pytestmark = pytest.mark.skipif(
    not TEST_DATABASE_URL,
    reason="TEST_DATABASE_URL is required for PostgreSQL/PostGIS integration tests",
)

FIXTURES = Path(__file__).parents[1] / "fixtures"
DASHBOARD_SNIPPET = (FIXTURES / "ipm_dashboard_snippet.html").read_bytes()

_WIDE_LANGUAGE_TABLES = (
    "geography_aliases",
    "government_body_aliases",
    "public_office_aliases",
    "source_documents",
)


@pytest.fixture(autouse=True)
def _remove_wide_language_rows_after_module() -> Iterator[None]:
    # These tests seed native-language aliases (e.g. Kannada) for every State
    # and UT. Migration 20260817_0005's downgrade cannot restore the narrow
    # en/te/und constraint while such rows exist, so leave the shared test
    # database in a downgrade-compatible state once this module has finished.
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


def _snapshot(retrieved_at: datetime) -> IpmSnapshot:
    return IpmSnapshot(
        key="mospi-ipm-2026-04",
        name="MoSPI Infrastructure Performance Monitoring dashboard (2026-04)",
        publisher="Ministry of Statistics and Programme Implementation (MoSPI)",
        url="https://ipm.mospi.gov.in/Home/PublicDashboard",
        public_url="https://ipm.mospi.gov.in/Home/PublicDashboard",
        request_method="POST",
        request_body="__RequestVerificationToken=fake&MonthYear=2026-04",
        content_type="text/html",
        raw=DASHBOARD_SNIPPET,
        retrieved_at=retrieved_at,
        month_year="2026-04",
    )


def test_ipm_dashboard_ingestion_and_comparisons(tmp_path: Path) -> None:
    engine = _prepare_database()
    now = datetime.now(UTC)

    with Session(engine) as session, session.begin():
        rows = parse_ipm_dashboard(DASHBOARD_SNIPPET.decode("utf-8"))
        assert len(rows) == 5

        stored = store_ipm_dashboard(session, tmp_path, _snapshot(now), rows)
        reviewed = review_ipm_observations(
            session,
            extraction_run_id=stored.extraction_run_id,
            reviewer_identity="integration:mospi-ipm",
            decided_at=now,
        )

        assert stored.snapshots_stored == 1
        assert stored.observations_created > 0
        assert stored.states_covered == 5
        assert reviewed == stored.observations_created
        assert (tmp_path / "snapshots" / f"{stored.sha256}.html").exists()
        assert session.scalar(select(func.count()).select_from(SourceSnapshot)) == 1

        published_observations = session.scalar(
            select(func.count())
            .select_from(SourceObservation)
            .where(SourceObservation.is_published.is_(True))
        )
        assert published_observations == 28 + stored.observations_created

    with Session(engine) as session, session.begin():
        summary = build_ipm_comparisons(
            session,
            reviewer_identity="integration-operator",
            decided_at=now,
        )
        assert summary["created"] > 0
        assert summary["skipped"] >= 0
        assert summary["updated"] == 0

    with Session(engine) as session:
        published_comparisons = list_published_comparisons(session)
        ipm_comparisons = [
            comparison
            for comparison in published_comparisons
            if comparison.comparison_kind
            == ComparisonKind.PROJECT_COST_VS_REVISED_COST.value
        ]
        assert len(ipm_comparisons) == 5
        for comparison in ipm_comparisons:
            assert comparison.is_published is True
            assert comparison.review_state == "reviewed"
            assert comparison.reviewer_identity == "integration-operator"
            assert comparison.claim_observation_id is not None
            assert comparison.record_observation_id is not None
            assert comparison.claim_label_en == "Approved cost"
            assert comparison.record_label_en == "Revised cost"
            assert comparison.claim_value is not None
            assert comparison.record_value is not None
        ap = next(
            comparison
            for comparison in ipm_comparisons
            if comparison.entity_label_en == "Andhra Pradesh"
        )
        assert ap.claim_value == Decimal("218753.69")
        assert ap.record_value == Decimal("271824.50")
        assert ap.verdict == "divergent"

    with Session(engine) as session, session.begin():
        rerun = build_ipm_comparisons(
            session,
            reviewer_identity="integration-operator",
            decided_at=now,
        )
        assert rerun["created"] == 0
        assert rerun["updated"] == summary["created"]

    with Session(engine) as session:
        count = session.scalar(
            select(func.count())
            .select_from(ClaimRecordComparison)
            .where(
                ClaimRecordComparison.comparison_kind
                == ComparisonKind.PROJECT_COST_VS_REVISED_COST.value
            )
        )
        assert count == summary["created"]
    engine.dispose()