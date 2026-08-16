from __future__ import annotations

import shutil
from pathlib import Path

import pytest

from app.ingestion.elections import (
    ElectionFeedError,
    _pdf_to_text,
    build_election_snapshot,
    parse_election_results,
)

FIXTURES = Path(__file__).parent / "fixtures"
TERM16_TEXT = (FIXTURES / "ap_legislature_members_term16.txt").read_text()
TERM15_TEXT = (FIXTURES / "ap_legislature_members_term15.txt").read_text()
TERM14_TEXT = (FIXTURES / "ap_legislature_members_term14.txt").read_text()
TERM16_PDF = (FIXTURES / "term16.pdf").read_bytes()


def test_parse_election_results_reads_the_term16_member_report() -> None:
    records = parse_election_results(TERM16_TEXT, term_id=16)

    assert len(records) == 175
    by_constituency = {record.constituency_en: record for record in records}
    ichchapuram = by_constituency["Ichchapuram"]
    assert ichchapuram.slug == "term16-1-ichchapuram"
    assert ichchapuram.term_period_en == "Term XVI (constituted 06.06.2024)"
    assert ichchapuram.member_name_en == "Sri Ashok Bendalam"
    assert ichchapuram.district_en == "SRIKAKULAM"
    assert ichchapuram.party_en == "TDP"
    assert ichchapuram.elected_via == "general_election"
    assert ichchapuram.seat_status == ""
    assert ichchapuram.constituency_no == "1"
    assert by_constituency["Kuppam"].member_name_en == "Sri Chandrababu Naidu Nara"
    assert by_constituency["Rajam (SC)"].reserved_category == "SC"
    assert by_constituency["Palakonda (ST)"].reserved_category == "ST"
    assert by_constituency["Visakhapatnam East"].reserved_category == ""
    assert all(record.constituency_no for record in records if record.constituency_en != "Kovur")
    assert len({record.slug for record in records}) == 175


def test_parse_election_results_reads_all_three_terms() -> None:
    for text, term_id, expected in (
        (TERM16_TEXT, 16, 175),
        (TERM15_TEXT, 15, 177),
        (TERM14_TEXT, 14, 179),
    ):
        records = parse_election_results(text, term_id=term_id)

        assert len(records) == expected
        assert all(record.member_name_en for record in records)
        assert all(record.constituency_en for record in records)
        assert all(record.party_en for record in records)
        assert all(record.district_en for record in records)
        assert len({record.slug for record in records}) == expected


def test_parse_election_results_recovers_by_election_rows() -> None:
    records_15 = parse_election_results(TERM15_TEXT, term_id=15)
    atmakur = [r for r in records_15 if r.constituency_en == "Atmakur"]
    assert len(atmakur) == 2
    original = next(r for r in atmakur if r.elected_via == "general_election")
    replacement = next(r for r in atmakur if r.elected_via == "bye_election")
    assert original.member_name_en == "Sri Mekapati Gowtham Reddy"
    assert original.slug == "term15-115-atmakur"
    assert replacement.member_name_en == "Sri Mekapati Vikram Reddy"
    assert replacement.slug == "term15-115-atmakur-bye-election"
    assert replacement.constituency_no == "115"

    records_14 = parse_election_results(TERM14_TEXT, term_id=14)
    nandigama = [r for r in records_14 if r.constituency_en == "Nandigama (SC)"]
    assert len(nandigama) == 2
    soumya = next(r for r in nandigama if r.elected_via == "bye_election")
    assert soumya.member_name_en == "Tangirala Soumya"
    assert soumya.party_en == "TDP"
    assert soumya.constituency_no == "202"
    assert soumya.slug == "term14-202-nandigama-sc-bye-election"

    badvel = [r for r in records_14 if r.constituency_en == "Badvel (SC)"]
    assert len(badvel) == 1

    allagadda = [r for r in records_14 if r.constituency_en == "Allagadda"]
    assert len(allagadda) == 2
    allagadda_original = next(r for r in allagadda if r.elected_via == "general_election")
    allagadda_replacement = next(r for r in allagadda if r.elected_via == "bye_election")
    assert allagadda_original.member_name_en == "Smt. Bhuma Shobha Nagi Reddy"
    assert allagadda_original.seat_status == "died"
    assert allagadda_original.slug == "term14-253-allagadda"
    assert allagadda_replacement.member_name_en == "Smt. Bhuma Akhila Priya"
    assert allagadda_replacement.slug == "term14-253-allagadda-bye-election"
    assert allagadda_replacement.constituency_no == "253"


def test_parse_election_results_classifies_seat_status() -> None:
    records_15 = parse_election_results(TERM15_TEXT, term_id=15)
    by_name = {r.member_name_en: r for r in records_15}
    assert by_name["Sri Mekapati Gowtham Reddy"].seat_status == "died"
    assert by_name["Sri Kotamreddy Sridhar Reddy"].seat_status == "disqualified"
    assert by_name["Sri Ganta Srinivasa Rao"].seat_status == "resigned"
    assert by_name["Sri Mekapati Vikram Reddy"].seat_status == "bye_election"
    assert by_name["Sri Ashok Bendalam"].seat_status == ""

    records_14 = parse_election_results(TERM14_TEXT, term_id=14)
    kidari = next(r for r in records_14 if r.constituency_en == "Araku Valley (ST)")
    assert kidari.seat_status == "died"


def test_parse_election_results_auto_detects_term() -> None:
    records = parse_election_results(TERM15_TEXT)

    assert records[0].term_id == 15
    assert records[0].term_period_en == "Term XV (constituted 24.05.2019)"


def test_parse_election_results_rejects_unsupported_term() -> None:
    with pytest.raises(ElectionFeedError, match="term_id 99"):
        parse_election_results(TERM16_TEXT, term_id=99)


def test_parse_election_results_rejects_wrong_term() -> None:
    with pytest.raises(ElectionFeedError, match="describes the 16 Assembly"):
        parse_election_results(TERM16_TEXT, term_id=15)


def test_parse_election_results_rejects_report_without_header() -> None:
    with pytest.raises(ElectionFeedError, match="term header"):
        parse_election_results("just some member names and parties\n", term_id=16)


def test_build_election_snapshot_captures_the_official_pdf() -> None:
    snapshot = build_election_snapshot(TERM16_PDF, term_id=16, file_name="term16.pdf")

    assert snapshot.key == "ap-legislature-election-results-term16"
    assert snapshot.request_method == "local_file"
    assert snapshot.request_body == "term16.pdf"
    assert snapshot.content_type == "application/pdf"
    assert snapshot.raw == TERM16_PDF
    assert snapshot.public_url == "https://aplegislature.org"


@pytest.mark.skipif(shutil.which("pdftotext") is None, reason="poppler-utils not installed")
def test_pdf_to_text_converts_the_official_term16_report() -> None:
    text = _pdf_to_text(TERM16_PDF)

    records = parse_election_results(text, term_id=16)
    assert len(records) == 175
