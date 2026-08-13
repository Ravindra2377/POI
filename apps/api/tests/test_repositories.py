from app.repositories import _search_pattern


def test_search_pattern_trims_and_escapes_sql_wildcards() -> None:
    assert _search_pattern(" Vizag ") == "%Vizag%"
    assert _search_pattern(r"100%_match\path") == r"%100\%\_match\\path%"


def test_search_pattern_ignores_empty_input() -> None:
    assert _search_pattern(None) is None
    assert _search_pattern("   ") is None
