from __future__ import annotations

from pathlib import Path
from urllib.request import Request

import pytest

from app.ingestion.officeholders import (
    AP_LEGISLATURE_PORTLET_INSTANCE,
    OfficeholderFeedError,
    build_officeholders_report_url,
    fetch_ap_officeholders,
    parse_officeholders,
)

FIXTURES = Path(__file__).parent / "fixtures"
TERM16_REPORT = (FIXTURES / "ap_legislature_members_term16.html").read_bytes()


class FakeResponse:
    def __init__(self, payload: bytes, status: int = 200) -> None:
        self.status = status
        self.headers = {"Content-Type": "text/html"}
        self._payload = payload

    def read(self) -> bytes:
        return self._payload

    def __enter__(self) -> FakeResponse:
        return self

    def __exit__(self, *args: object) -> None:
        return None


def test_parse_officeholders_reads_the_term16_member_report() -> None:
    records = parse_officeholders(TERM16_REPORT, term_id=16)

    assert len(records) == 3
    by_constituency = {record.constituency_en: record for record in records}
    ichchapuram = by_constituency["ICHCHAPURAM"]
    assert ichchapuram.slug == "term16-3107-ichchapuram"
    assert ichchapuram.person_name_en == "SRI ASHOK BENDALAM"
    assert ichchapuram.district_en == "SRIKAKULAM"
    assert ichchapuram.office_title_en == "Member of Legislative Assembly"
    assert ichchapuram.government_body_en == "Andhra Pradesh Legislative Assembly"
    assert ichchapuram.term_period_en == "Term XVI (constituted 06.06.2024)"
    assert ichchapuram.party_en == "TDP"
    assert ichchapuram.member_id == "3107"
    assert ichchapuram.constituted_on == "06.06.2024"
    assert by_constituency["PALASA"].person_name_en == "SMT. GOUTHU SIREESHA"
    assert by_constituency["RAYADURG"].district_en == "ANANTAPUR"
    assert by_constituency["RAYADURG"].person_name_en == "SRI KALAVA SRINIVASULU"
    assert all(record.district_en for record in records)
    assert all(record.constituency_en for record in records)


def test_parse_officeholders_rejects_invalid_payloads() -> None:
    with pytest.raises(OfficeholderFeedError, match="UTF-8"):
        parse_officeholders(b"\xff\xfe not utf-8", term_id=16)
    with pytest.raises(OfficeholderFeedError, match="term header"):
        parse_officeholders(b"<html><body>no assembly header here</body></html>", term_id=16)
    with pytest.raises(OfficeholderFeedError, match="member table"):
        parse_officeholders(
            b"<h4>SIXTEENTH ANDHRA PRADESH LEGISLATIVE ASSEMBLY CONSTITUTED ON 06.06.2024</h4>"
            b"<div>no table</div>",
            term_id=16,
        )


def test_parse_officeholders_rejects_wrong_term() -> None:
    with pytest.raises(OfficeholderFeedError, match="describes the SIXTEENTH Assembly"):
        parse_officeholders(TERM16_REPORT, term_id=15)


def test_parse_officeholders_rejects_member_missing_name() -> None:
    malformed = (
        TERM16_REPORT.replace(b"class=\"cbp-vm-title mem_name\"", b"class=\"broken\"", 1)
        .replace(b"alt=\"SRI  ASHOK BENDALAM\"", b"alt=\"\"", 1)
    )
    with pytest.raises(OfficeholderFeedError, match="missing its name or constituency"):
        parse_officeholders(malformed, term_id=16)


def test_parse_officeholders_rejects_unsupported_term() -> None:
    with pytest.raises(OfficeholderFeedError, match="term_id 99"):
        parse_officeholders(TERM16_REPORT, term_id=99)


def test_parse_officeholders_keeps_by_election_members_distinct() -> None:
    snippet = b"""<h4>SIXTEENTH ANDHRA PRADESH LEGISLATIVE ASSEMBLY CONSTITUTED ON 06.06.2024</h4>
<ul class="table1">
<h4>SRIKAKULAM</h4>
<li><div class="data">
<a href="..._mem_id=1001&..."><font class="cbp-vm-title mem_name">SRI ONE MEMBER</font></a>
<div class="cbp-vm-price const_name"><span class="const_id">1. </span>ATMAKUR</div>
<div class="cbp-vm-icon cbp-vm-add">TDP</div>
</div></li><li><div class="data">
<a href="..._mem_id=1002&..."><font class="cbp-vm-title mem_name">SRI TWO MEMBER</font></a>
<div class="cbp-vm-price const_name"><span class="const_id">1. </span>ATMAKUR</div>
<div class="cbp-vm-icon cbp-vm-add">YSRCP</div>
</div></li>
</ul>
"""

    records = parse_officeholders(snippet, term_id=16)

    assert len(records) == 2
    slugs = {record.slug for record in records}
    assert slugs == {"term16-1001-atmakur", "term16-1002-atmakur"}


def test_build_officeholders_request_targets_the_portlet_report() -> None:
    url = build_officeholders_report_url(16)

    assert url.startswith(
        "https://aplegislature.org/web/legislative-assembly/legislative-assembly/member-s-information"
    )
    assert AP_LEGISLATURE_PORTLET_INSTANCE in url
    assert "p_p_lifecycle=0" in url
    assert f"_{AP_LEGISLATURE_PORTLET_INSTANCE}_term_id=16" in url


def test_fetch_ap_officeholders_gets_the_term_report(monkeypatch: pytest.MonkeyPatch) -> None:
    captured: dict[str, object] = {}

    def fake_urlopen(request: Request, timeout: float) -> FakeResponse:
        captured["url"] = request.full_url
        captured["data"] = request.data
        captured["method"] = request.method
        return FakeResponse(TERM16_REPORT)

    monkeypatch.setattr("app.ingestion.officeholders.urlopen", fake_urlopen)
    snapshot = fetch_ap_officeholders(term_id=16, timeout=5.0)

    assert snapshot.request_method == "GET"
    assert snapshot.request_body is None
    assert snapshot.raw == TERM16_REPORT
    assert snapshot.key == "ap-legislature-officeholders-term16"
    assert snapshot.public_url == "https://aplegislature.org"
    assert captured["data"] is None
    assert captured["method"] == "GET"
    assert AP_LEGISLATURE_PORTLET_INSTANCE in str(captured["url"])
    assert "_term_id=16" in str(captured["url"])


def test_fetch_ap_officeholders_raises_on_non_200(monkeypatch: pytest.MonkeyPatch) -> None:
    def fake_urlopen(request: Request, timeout: float) -> FakeResponse:
        return FakeResponse(b"", status=434)

    monkeypatch.setattr("app.ingestion.officeholders.urlopen", fake_urlopen)
    with pytest.raises(OfficeholderFeedError, match="HTTP 434"):
        fetch_ap_officeholders(term_id=16, timeout=5.0, max_attempts=1)


def test_fetch_ap_officeholders_retries_transient_failures(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    calls: list[int] = []

    def fake_urlopen(request: Request, timeout: float) -> FakeResponse:
        calls.append(1)
        if len(calls) < 3:
            return FakeResponse(b"Page Not Found", status=200)
        return FakeResponse(TERM16_REPORT)

    monkeypatch.setattr("app.ingestion.officeholders.urlopen", fake_urlopen)
    monkeypatch.setattr("app.ingestion.officeholders.time.sleep", lambda seconds: None)

    snapshot = fetch_ap_officeholders(term_id=16, timeout=5.0)

    assert len(calls) == 3
    assert snapshot.raw == TERM16_REPORT


def test_fetch_ap_officeholders_retries_then_raises(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    calls: list[int] = []

    def fake_urlopen(request: Request, timeout: float) -> FakeResponse:
        calls.append(1)
        return FakeResponse(b"Page Not Found", status=200)

    monkeypatch.setattr("app.ingestion.officeholders.urlopen", fake_urlopen)
    monkeypatch.setattr("app.ingestion.officeholders.time.sleep", lambda seconds: None)

    with pytest.raises(OfficeholderFeedError, match="rate-limited"):
        fetch_ap_officeholders(term_id=16, timeout=5.0, max_attempts=3)

    assert len(calls) == 3
