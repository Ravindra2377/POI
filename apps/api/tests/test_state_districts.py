from __future__ import annotations

import json
from typing import cast
from urllib.request import Request

import pytest

from app.commands.ingest_state_districts import _resolve_states
from app.ingestion.all_states import ALL_INDIA_STATES_UTS
from app.ingestion.districts import (
    DistrictFeedError,
    DistrictFeedRecord,
    _district_slug,
    fetch_lgd_district_feed,
    lgd_request_body,
    parse_lgd_districts,
)
from app.seeds.seed_stage1 import LGD_DISTRICT_URL

KA_PAYLOAD = json.dumps(
    [
        {
            "districtCode": 601,
            "districtNameEnglish": "Bengaluru Urban",
            "districtNameLocal": "ಬೆಂಗಳೂರು ನಗರ",
        },
        {
            "districtCode": 602,
            "districtNameEnglish": "Belagavi",
            "districtNameLocal": "ಬೆಳಗಾವಿ",
        },
    ]
).encode("utf-8")


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


def test_lgd_request_body_uses_the_state_code() -> None:
    assert lgd_request_body("29") == "stateCode=29"


def test_fetch_lgd_district_feed_posts_the_state_code(
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
        return FakeResponse(KA_PAYLOAD)

    monkeypatch.setattr("app.ingestion.districts.urlopen", fake_urlopen)
    snapshot = fetch_lgd_district_feed("29", timeout=5.0)

    assert calls == [(LGD_DISTRICT_URL, "POST", b"stateCode=29")]
    assert snapshot.key == "lgd-district-list-29"
    assert snapshot.request_method == "POST"
    assert snapshot.request_body == "stateCode=29"
    assert snapshot.publisher == "Local Government Directory (LGD)"
    assert snapshot.raw == KA_PAYLOAD


def test_fetch_lgd_district_feed_raises_on_non_200(monkeypatch: pytest.MonkeyPatch) -> None:
    def fake_urlopen(request: Request, timeout: float) -> FakeResponse:
        return FakeResponse(b"", status=434)

    monkeypatch.setattr("app.ingestion.districts.urlopen", fake_urlopen)
    with pytest.raises(DistrictFeedError, match="HTTP 434"):
        fetch_lgd_district_feed("29", timeout=5.0)


def test_parse_lgd_districts_reads_a_national_payload() -> None:
    records = parse_lgd_districts(KA_PAYLOAD)

    assert len(records) == 2
    assert records[0].lgd_code == "601"
    assert records[0].name_en == "Bengaluru Urban"
    assert records[0].name_local == "ಬೆಂಗಳೂರು ನಗರ"
    assert all(record.name_local for record in records)


def test_district_slug_is_state_prefixed() -> None:
    record = DistrictFeedRecord(lgd_code="601", name_en="Bengaluru Urban", name_local="ಬೆಂಗಳೂರು")
    assert _district_slug("IN-KA", record) == "in-ka-bengaluruurban"


def test_resolve_states_selects_one_state() -> None:
    states = _resolve_states(["IN-KA"])
    assert len(states) == 1
    assert states[0].iso_code == "IN-KA"
    assert states[0].lgd_code == 29


def test_resolve_states_defaults_to_all_except_andhra_pradesh() -> None:
    states = _resolve_states(None)
    assert len(states) == len(ALL_INDIA_STATES_UTS) - 1
    assert all(state.iso_code != "IN-AP" for state in states)


def test_resolve_states_rejects_andhra_pradesh() -> None:
    with pytest.raises(DistrictFeedError, match="app.commands.ingest_districts"):
        _resolve_states(["IN-AP"])


def test_resolve_states_rejects_unknown_codes() -> None:
    with pytest.raises(DistrictFeedError, match="IN-XX"):
        _resolve_states(["IN-XX"])
