from __future__ import annotations

from pathlib import Path
from urllib.request import Request

import pytest

from app.ingestion.schemes import (
    MYSCHEME_API_KEY,
    SchemeFeedError,
    SchemeFeedRecord,
    build_search_url,
    fetch_ap_schemes,
    parse_ap_schemes,
)

FIXTURES = Path(__file__).parent / "fixtures"
SCHEME_PAYLOAD = (FIXTURES / "myscheme_ap_schemes_live.json").read_bytes()


class FakeResponse:
    def __init__(self, payload: bytes, status: int = 200) -> None:
        self.status = status
        self.headers = {"Content-Type": "application/json"}
        self._payload = payload

    def read(self) -> bytes:
        return self._payload

    def __enter__(self) -> FakeResponse:
        return self

    def __exit__(self, *args: object) -> None:
        return None


def test_parse_ap_schemes_reads_the_live_20_scheme_payload() -> None:
    records = parse_ap_schemes(SCHEME_PAYLOAD)

    assert len(records) == 20
    by_slug = {record.slug: record for record in records}
    assert by_slug["ysrrb"].name_en == "YSR Rythu Bharosa"
    assert by_slug["ysrrb"].category_en == "Agriculture,Rural & Environment"
    assert by_slug["jav"].name_en == "Jagananna Amma Vodi"
    assert by_slug["dysrhis"].name_en == "Dr. YSR Aarogyasri Health Insurance Scheme"
    assert all(record.description_en for record in records)
    assert all(record.slug for record in records)


def test_parse_ap_schemes_rejects_invalid_payloads() -> None:
    with pytest.raises(SchemeFeedError):
        parse_ap_schemes(b"not json")
    with pytest.raises(SchemeFeedError):
        parse_ap_schemes(b'{"data": {}}')
    with pytest.raises(SchemeFeedError):
        parse_ap_schemes(b'{"data": {"summary": {}, "hits": {"items": []}}}')
    with pytest.raises(SchemeFeedError):
        parse_ap_schemes(b'{"data": {"summary": {}, "hits": {"items": [{"fields": {}}]}}}')


def test_scheme_feed_record_keeps_scheme_id() -> None:
    record = SchemeFeedRecord(
        slug="ysrrb",
        name_en="YSR Rythu Bharosa",
        description_en="Financial assistance.",
        category_en="Agriculture,Rural & Environment",
        scheme_id="vQyOyokB1csUTixB4t8L",
    )
    assert record.scheme_id == "vQyOyokB1csUTixB4t8L"


def test_build_search_url_filters_to_ap_state_schemes() -> None:
    url = build_search_url()

    assert url.startswith("https://api.myscheme.gov.in/search/v3/schemes?lang=en")
    assert "beneficiaryState" in url
    assert "Andhra%20Pradesh" in url or "Andhra" in url
    assert "level" in url
    assert "size=100" in url


def test_fetch_ap_schemes_uses_get_and_api_key(monkeypatch: pytest.MonkeyPatch) -> None:
    captured_headers: dict[str, str] = {}

    def fake_urlopen(request: Request, timeout: float) -> FakeResponse:
        captured_headers.update(
            {key.casefold(): value for key, value in request.header_items()}
        )
        return FakeResponse(SCHEME_PAYLOAD)

    monkeypatch.setattr("app.ingestion.schemes.urlopen", fake_urlopen)
    snapshot = fetch_ap_schemes(timeout=5.0)

    assert snapshot.request_method == "GET"
    assert snapshot.raw == SCHEME_PAYLOAD
    assert snapshot.public_url == "https://www.myscheme.gov.in/search/state/Andhra Pradesh"
    assert captured_headers.get("x-api-key") == MYSCHEME_API_KEY


def test_fetch_ap_schemes_raises_on_non_200(monkeypatch: pytest.MonkeyPatch) -> None:
    def fake_urlopen(request: Request, timeout: float) -> FakeResponse:
        return FakeResponse(b"", status=434)

    monkeypatch.setattr("app.ingestion.schemes.urlopen", fake_urlopen)
    with pytest.raises(SchemeFeedError, match="HTTP 434"):
        fetch_ap_schemes(timeout=5.0)