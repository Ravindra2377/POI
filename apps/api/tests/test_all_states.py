"""Unit tests for the All-India 36 States & Union Territories registry."""

from app.ingestion.all_states import ALL_INDIA_STATES_UTS, get_all_states
from app.ingestion.languages import LANGUAGES_BY_CODE


def test_all_india_states_registry_count() -> None:
    # Must cover exactly 28 States + 8 Union Territories = 36 Level-1 Divisions
    assert len(ALL_INDIA_STATES_UTS) == 36

    states = [s for s in ALL_INDIA_STATES_UTS if s.category == "state"]
    uts = [s for s in ALL_INDIA_STATES_UTS if s.category == "union_territory"]

    assert len(states) == 28
    assert len(uts) == 8


def test_all_india_states_codes_unique() -> None:
    iso_codes = [s.iso_code for s in ALL_INDIA_STATES_UTS]
    lgd_codes = [s.lgd_code for s in ALL_INDIA_STATES_UTS]

    assert len(iso_codes) == len(set(iso_codes))
    assert len(lgd_codes) == len(set(lgd_codes))


def test_get_all_states_dictionary() -> None:
    data = get_all_states()
    assert len(data) == 36
    ap = next(item for item in data if item["iso_code"] == "IN-AP")
    assert ap["name_en"] == "Andhra Pradesh"
    assert ap["capital"] == "Amaravati"
    assert ap["assembly_seats"] == 175


def test_every_state_language_code_is_known() -> None:
    known = set(LANGUAGES_BY_CODE)
    for state in ALL_INDIA_STATES_UTS:
        assert state.native_language in known
        for language in state.official_languages:
            assert language in known


def test_get_all_states_exposes_official_languages() -> None:
    data = get_all_states()
    tn = next(item for item in data if item["iso_code"] == "IN-TN")
    assert tn["official_languages"] == ["ta", "en"]