"""Tests for the AP AFS budget ingestion module."""

from decimal import Decimal
from pathlib import Path

from app.ingestion.budget import (
    BudgetLine,
    _head_name_garbled,
    _normalise_value,
    canonical_head_names,
    parse_afs_layout,
    reconcile_head_names,
)

FIXTURES = Path(__file__).parent / "fixtures"


def _fixture(name: str) -> str:
    return (FIXTURES / name).read_text(encoding="utf-8")


def _line(
    *,
    statement: str = "revenue_receipts",
    code: str = "0049",
    name_en: str = "Interest Receipts",
) -> BudgetLine:
    return BudgetLine(
        fiscal_year="2024-25",
        statement=statement,
        code=code,
        name_en=name_en,
        unit="crores",
        unit_factor=10000000,
        values=("1,00.00",),
        rupees=(Decimal("10000000"),),
    )


def test_parse_afs_layout_reads_major_heads() -> None:
    rows = parse_afs_layout(_fixture("ap_afs_layout_snippet.txt"), fiscal_year="2014-15")
    assert [r.code for r in rows] == ["0049", "0050", "0051", "0071", "0202", "0210"]
    head = rows[0]
    assert head.statement == "revenue_receipts"
    assert head.name_en == "Interest Receipts"
    assert head.unit == "Thousands"
    assert head.unit_factor == 1000
    assert head.values == ("9625,53,80", "8656,08,85", "8656,08,85", "4813,02,25")


def test_parse_afs_layout_decodes_rupee_amounts() -> None:
    rows = parse_afs_layout(_fixture("ap_afs_layout_snippet.txt"), fiscal_year="2014-15")
    head = next(r for r in rows if r.code == "0049")
    assert str(head.rupees[0]) == "96255380000"
    assert head.rupees[0] == _normalise_value("9625,53,80", 1000)


def test_parse_afs_layout_joins_wrapped_names() -> None:
    rows = parse_afs_layout(_fixture("ap_afs_layout_snippet.txt"), fiscal_year="2014-15")
    head = next(r for r in rows if r.code == "0202")
    assert head.name_en == "Education, Sports, Art and Culture"
    pension = next(r for r in rows if r.code == "0071")
    assert "Retirement Benefits" in pension.name_en


def test_parse_afs_layout_handles_wrapped_code_layout() -> None:
    rows = parse_afs_layout(_fixture("ap_afs_layout_wrapped.txt"), fiscal_year="2020-21")
    assert len(rows) == 1
    head = rows[0]
    assert head.statement == "public_debt_disbursements"
    assert head.code == "6801"
    assert head.name_en == "Loans for Power Projects"
    assert len(head.values) == 4


def test_parse_afs_layout_skips_subtotals_and_blank_cells() -> None:
    rows = parse_afs_layout(_fixture("ap_afs_layout_wrapped.txt"), fiscal_year="2020-21")
    assert all(r.code != "6435" for r in rows)
    assert all(not r.name_en.startswith("Total") for r in rows)


def test_parse_afs_layout_returns_empty_for_nonsense() -> None:
    assert parse_afs_layout("no codes here", fiscal_year="2024-25") == []


def test_head_name_garbled_detects_missing_and_merged_names() -> None:
    assert _head_name_garbled("")
    assert _head_name_garbled("Loans for Housing Loans for Urban")
    assert not _head_name_garbled("Loans for Housing")


def test_canonical_head_names_picks_longest_near_leading_name() -> None:
    rows = [
        _line(name_en="Loans for Housing"),
        _line(name_en="Loans for Housing"),
        _line(name_en="Loans for Housing Loans for Urban"),
    ]
    canonical = canonical_head_names([rows])
    assert canonical[("revenue_receipts", "0049")] == "Loans for Housing"


def test_canonical_head_names_skips_unparsable_names() -> None:
    canonical = canonical_head_names([[_line(name_en="")]])
    assert ("revenue_receipts", "0049") not in canonical


def test_reconcile_head_names_fixes_only_garbled_names() -> None:
    canonical = {
        ("revenue_receipts", "0049"): "Loans for Housing",
        ("revenue_receipts", "0050"): "Loans for Power Projects",
    }
    rows = [
        _line(code="0049", name_en="Loans for Housing Loans for Urban"),
        _line(code="0050", name_en="Loans for Power Projects"),
    ]
    reconciled = reconcile_head_names(rows, canonical)
    assert reconciled[0].name_en == "Loans for Housing"
    assert reconciled[1].name_en == "Loans for Power Projects"
    assert reconciled[0].values == ("1,00.00",)


def test_reconcile_head_names_keeps_name_when_no_canonical() -> None:
    rows = [_line(name_en="")]
    assert reconcile_head_names(rows, {})[0].name_en == ""


def test_year_matches_accepts_long_and_short_fiscal_year_forms() -> None:
    from app.commands.ingest_budget import _year_matches

    assert _year_matches("2025-26", "2025-2026")
    assert _year_matches("2025-2026", "2025-2026")
    assert _year_matches(" 2014-15 ", "2014-2015")
    assert not _year_matches("2024-25", "2025-2026")
    assert not _year_matches("budget", "2025-2026")