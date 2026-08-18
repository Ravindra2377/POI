"""Unit tests for the MoSPI IPM dashboard ingestion and its comparison builder."""

from datetime import UTC, datetime
from decimal import Decimal
from pathlib import Path

import pytest

from app.ingestion.comparisons import compute_verdict
from app.ingestion.ipm import (
    DEFAULT_MONTH_YEAR,
    MOSPI_STATE_IDS,
    IpmFeedError,
    parse_ipm_dashboard,
)
from app.models.enums import ComparisonVerdict

FIXTURES = Path(__file__).parent / "fixtures"
DASHBOARD_SNIPPET = (FIXTURES / "ipm_dashboard_snippet.html").read_bytes()


def test_mospi_state_ids_cover_all_36_states_and_uts() -> None:
    assert len(MOSPI_STATE_IDS) == 36
    assert set(MOSPI_STATE_IDS.values()) == {
        "IN-AN", "IN-AP", "IN-AR", "IN-AS", "IN-BR", "IN-CH", "IN-CT",
        "IN-DH", "IN-DL", "IN-GA", "IN-GJ", "IN-HR", "IN-HP", "IN-JK",
        "IN-JH", "IN-KA", "IN-KL", "IN-LA", "IN-LD", "IN-MP", "IN-MH",
        "IN-MN", "IN-ML", "IN-MZ", "IN-NL", "IN-OR", "IN-PB", "IN-PY",
        "IN-RJ", "IN-SK", "IN-TN", "IN-TG", "IN-TR", "IN-UP", "IN-UT",
        "IN-WB",
    }
    assert MOSPI_STATE_IDS[1] == "IN-AP"


def test_default_month_year_is_verified_freeze() -> None:
    assert DEFAULT_MONTH_YEAR == "2026-04"


def test_parse_ipm_dashboard_extracts_state_rows() -> None:
    rows = parse_ipm_dashboard(DASHBOARD_SNIPPET.decode("utf-8"))

    assert len(rows) == 5
    ap = next(row for row in rows if row.state_name == "Andhra Pradesh")
    assert ap.state_id == 1
    assert ap.total_projects == 142
    assert ap.approved_cost_crores == Decimal("218753.69")
    assert ap.revised_cost_crores == Decimal("271824.5")
    assert ap.cumulative_expenditure_crores == Decimal("146693.06")


def test_parse_ipm_dashboard_missing_array_raises() -> None:
    with pytest.raises(IpmFeedError):
        parse_ipm_dashboard("<html><body>no data here</body></html>")


def test_parse_ipm_dashboard_malformed_array_raises() -> None:
    with pytest.raises(IpmFeedError):
        parse_ipm_dashboard("<script>var RevisedData = [{'bad': true}]</script>")


def test_ipm_comparison_verdict_matches_budget_semantics() -> None:
    approved = Decimal("218753.69")
    revised = Decimal("271824.50")
    verdict, difference, percent = compute_verdict(approved, revised, Decimal("5.00"))

    assert verdict == ComparisonVerdict.DIVERGENT
    assert difference == Decimal("53070.81")
    assert percent == Decimal("24.26")


def test_ipm_comparison_verdict_within_tolerance() -> None:
    approved = Decimal("100")
    revised = Decimal("102")
    verdict, _, _ = compute_verdict(approved, revised, Decimal("5.00"))

    assert verdict == ComparisonVerdict.CONSISTENT


def test_ipm_comparison_kind_value() -> None:
    from app.models.enums import ComparisonKind

    assert ComparisonKind.PROJECT_COST_VS_REVISED_COST.value == "project_cost_vs_revised_cost"


def _now() -> datetime:
    return datetime.now(UTC)