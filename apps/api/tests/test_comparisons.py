"""Tests for the claims-vs-records comparison engine and API."""

from decimal import Decimal

from fastapi.testclient import TestClient

from app.ingestion.comparisons import compute_verdict
from app.models.enums import ComparisonVerdict


def test_compute_verdict_consistent_within_tolerance() -> None:
    verdict, difference, percent = compute_verdict(
        Decimal("1000"), Decimal("1020"), Decimal("5.00")
    )
    assert verdict == ComparisonVerdict.CONSISTENT
    assert difference == Decimal("20")
    assert percent == Decimal("2.00")


def test_compute_verdict_divergent_beyond_tolerance() -> None:
    verdict, difference, percent = compute_verdict(
        Decimal("1000"), Decimal("1100"), Decimal("5.00")
    )
    assert verdict == ComparisonVerdict.DIVERGENT
    assert difference == Decimal("100")
    assert percent == Decimal("10.00")


def test_compute_verdict_negative_claim_direction() -> None:
    verdict, difference, percent = compute_verdict(
        Decimal("-1000"), Decimal("-800"), Decimal("5.00")
    )
    assert verdict == ComparisonVerdict.DIVERGENT
    assert percent == Decimal("-20.00")


def test_compute_verdict_missing_side_is_insufficient() -> None:
    verdict, difference, percent = compute_verdict(
        None, Decimal("1000"), Decimal("5.00")
    )
    assert verdict == ComparisonVerdict.INSUFFICIENT_DATA
    assert difference is None
    assert percent is None


def test_compute_verdict_zero_claim_with_equal_record_is_consistent() -> None:
    verdict, difference, percent = compute_verdict(
        Decimal("0"), Decimal("0"), Decimal("5.00")
    )
    assert verdict == ComparisonVerdict.CONSISTENT
    assert difference == Decimal("0")
    assert percent is None


def test_compute_verdict_zero_claim_with_record_is_divergent() -> None:
    verdict, difference, percent = compute_verdict(
        Decimal("0"), Decimal("50"), Decimal("5.00")
    )
    assert verdict == ComparisonVerdict.DIVERGENT
    assert difference == Decimal("50")
    assert percent is None


def test_comparisons_endpoint_returns_prepared_empty(
    client: TestClient,
) -> None:
    response = client.get("/api/v1/comparisons")

    assert response.status_code == 200
    assert response.json() == {"data": [], "status": "prepared-empty"}