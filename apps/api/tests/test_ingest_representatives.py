from datetime import date

from app.ingestion.representatives import (
    _is_placeholder_constituency,
    _parse_constituted_date,
    _parse_term_id,
    _slugify,
    _unique_slug,
)


def test_parse_constituted_date_reads_term_period_text() -> None:
    assert _parse_constituted_date("Term XVI (constituted 06.06.2024)") == date(2024, 6, 6)
    assert _parse_constituted_date("") is None
    assert _parse_constituted_date("Term XVI") is None
    assert _parse_constituted_date("Term X (constituted 01.01.1999)") == date(1999, 1, 1)


def test_parse_term_id_reads_the_slug_prefix() -> None:
    assert _parse_term_id("term16-3107-ichchapuram") == 16
    assert _parse_term_id("term14-9-nominated") == 14
    assert _parse_term_id("ichchapuram") is None


def test_placeholder_constituency_is_flagged() -> None:
    assert _is_placeholder_constituency("NOMINATED") is True
    assert _is_placeholder_constituency("nominated") is True
    assert _is_placeholder_constituency("") is True
    assert _is_placeholder_constituency("ICHCHAPURAM") is False


def test_slugify_matches_officeholder_convention() -> None:
    assert _slugify("SRI ASHOK BENDALAM") == "sri-ashok-bendalam"
    assert _slugify("ICHCHAPURAM") == "ichchapuram"
    assert _slugify("") == "unknown"


def test_unique_slug_disambiguates_within_a_run() -> None:
    used: set[str] = set()
    assert _unique_slug("sri-k-ranga-rao", used) == "sri-k-ranga-rao"
    assert _unique_slug("sri-k-ranga-rao", used) == "sri-k-ranga-rao-2"
    assert _unique_slug("sri-k-ranga-rao", used) == "sri-k-ranga-rao-3"