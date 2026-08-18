from __future__ import annotations

from pathlib import Path
from typing import cast
from urllib.request import Request

import pytest

from app.ingestion.districts import (
    DistrictFeedError,
    DistrictFeedRecord,
    attach_portal_codes,
    fetch_district_sources,
    parse_ap_portal_codes,
    parse_lgd_districts,
)
from app.seeds.seed_stage1 import AP_DISTRICT_URL, LGD_DISTRICT_URL, load_manifest

FIXTURES = Path(__file__).parent / "fixtures"
LGD_PAYLOAD = (FIXTURES / "lgd_districts_live.json").read_bytes()
AP_PAYLOAD = (FIXTURES / "ap_districts_live.json").read_bytes()


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


def test_parse_lgd_districts_reads_the_live_28_district_payload() -> None:
    records = parse_lgd_districts(LGD_PAYLOAD)

    assert len(records) == 28
    by_code = {record.lgd_code: record for record in records}
    assert by_code["790"].name_en == "Markapuram"
    assert by_code["791"].name_en == "Polavaram"
    assert by_code["520"].name_en == "Visakhapatnam"
    assert all(record.name_local for record in records)


def test_parse_lgd_districts_rejects_invalid_payloads() -> None:
    with pytest.raises(DistrictFeedError):
        parse_lgd_districts(b"not json")
    with pytest.raises(DistrictFeedError):
        parse_lgd_districts(b"[]")
    with pytest.raises(DistrictFeedError):
        parse_lgd_districts(b'[{"districtCode": 1}]')


def test_parse_lgd_districts_falls_back_to_english_name_for_empty_local_name() -> None:
    payload = (
        b'[{"districtCode": "2", "districtNameEnglish": "Budgam", "districtNameLocal": ""},'
        b'{"districtCode": "620", "districtNameEnglish": "Kishtwar", "districtNameLocal": null}]'
    )

    records = parse_lgd_districts(payload)

    assert len(records) == 2
    by_code = {record.lgd_code: record for record in records}
    assert by_code["2"].name_local == "Budgam"
    assert by_code["620"].name_local == "Kishtwar"
    assert by_code["2"].name_en == "Budgam"
    assert by_code["620"].name_en == "Kishtwar"


def test_parse_ap_portal_codes_reads_the_live_payload() -> None:
    codes = parse_ap_portal_codes(AP_PAYLOAD)

    assert len(codes) == 28
    assert codes["520"] == "VISAKHAPATNAM"
    assert codes["538"] == "MARKAPURAM"
    assert codes["537"] == "POLAVARAM"


def test_attach_portal_codes_covers_all_28_districts() -> None:
    manifest = load_manifest()
    assert len(manifest.districts) == 26

    enriched = attach_portal_codes(
        parse_lgd_districts(LGD_PAYLOAD), parse_ap_portal_codes(AP_PAYLOAD)
    )

    assert len(enriched) == 28
    by_code = {record.lgd_code: record for record in enriched}
    assert all(record.ap_portal_code for record in enriched)
    assert by_code["520"].ap_portal_code == "520"
    assert by_code["790"].ap_portal_code == "538"
    assert by_code["791"].ap_portal_code == "537"


def test_fetch_district_sources_uses_post_for_lgd_and_get_for_ap(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    calls: list[tuple[str, str, bytes | None]] = []

    def fake_urlopen(request: Request, timeout: float) -> FakeResponse:
        calls.append(
            (
                request.full_url,
                request.get_method(),
                cast("bytes | None", request.data),
            )
        )
        payload = LGD_PAYLOAD if request.full_url == LGD_DISTRICT_URL else AP_PAYLOAD
        return FakeResponse(payload)

    monkeypatch.setattr("app.ingestion.districts.urlopen", fake_urlopen)
    lgd_snapshot, ap_snapshot = fetch_district_sources(timeout=5.0)

    assert calls[0] == (LGD_DISTRICT_URL, "POST", b"stateCode=28")
    assert calls[1] == (AP_DISTRICT_URL, "GET", None)
    assert lgd_snapshot.request_method == "POST"
    assert ap_snapshot.request_method == "GET"
    assert lgd_snapshot.raw == LGD_PAYLOAD
    assert ap_snapshot.raw == AP_PAYLOAD


def test_fetch_district_sources_raises_on_non_200(monkeypatch: pytest.MonkeyPatch) -> None:
    def fake_urlopen(request: Request, timeout: float) -> FakeResponse:
        return FakeResponse(b"", status=434)

    monkeypatch.setattr("app.ingestion.districts.urlopen", fake_urlopen)
    with pytest.raises(DistrictFeedError, match="HTTP 434"):
        fetch_district_sources(timeout=5.0)


def test_district_feed_record_defaults_ap_code_to_none() -> None:
    record = DistrictFeedRecord(lgd_code="790", name_en="Markapuram", name_local="Markapuram")
    assert record.ap_portal_code is None
    assert AP_DISTRICT_URL.startswith("https://www.ap.gov.in/")
