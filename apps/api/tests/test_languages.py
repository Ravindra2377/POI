"""Unit tests for the Indian language registry and language_code enum coverage."""

from app.ingestion.all_states import ALL_INDIA_STATES_UTS, validate_state_language_codes
from app.ingestion.languages import (
    EIGHTH_SCHEDULE_CODES,
    LANGUAGE_REGISTRY,
    LANGUAGES_BY_CODE,
)
from app.models.enums import ALL_LANGUAGE_CODE_VALUES, LanguageCode


def test_language_enum_covers_all_eighth_schedule_languages() -> None:
    expected = {
        "as",
        "bn",
        "brx",
        "doi",
        "gu",
        "hi",
        "kn",
        "ks",
        "kok",
        "mai",
        "ml",
        "mni",
        "mr",
        "ne",
        "or",
        "pa",
        "sa",
        "sat",
        "sd",
        "ta",
        "te",
        "ur",
    }
    assert expected.issubset(set(ALL_LANGUAGE_CODE_VALUES))
    assert expected == EIGHTH_SCHEDULE_CODES


def test_language_enum_keeps_english_te_and_und() -> None:
    assert LanguageCode.EN.value == "en"
    assert LanguageCode.TE.value == "te"
    assert LanguageCode.UND.value == "und"


def test_language_registry_matches_enum() -> None:
    # UND (undetermined) is a sentinel value, not a real language.
    assert {record.code for record in LANGUAGE_REGISTRY} == set(
        ALL_LANGUAGE_CODE_VALUES
    ) - {LanguageCode.UND.value}
    for record in LANGUAGE_REGISTRY:
        assert record.english_name
        assert record.native_name
        assert record.script
        assert LANGUAGES_BY_CODE[record.code] is record


def test_every_state_native_language_is_registered() -> None:
    codes = {record.code for record in LANGUAGE_REGISTRY}
    for state in ALL_INDIA_STATES_UTS:
        assert state.native_language in codes
        assert state.native_language in LanguageCode
        for language in state.official_languages:
            assert language in codes
            assert language in LanguageCode


def test_state_language_validation_reports_no_problems() -> None:
    assert validate_state_language_codes() == []