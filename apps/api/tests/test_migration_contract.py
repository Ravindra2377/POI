from pathlib import Path

MIGRATION = (
    Path(__file__).parents[1] / "alembic" / "versions" / "20260810_0001_geography_foundation.py"
)


def test_migration_enables_postgis_idempotently_and_has_no_json_geometry_fallback() -> None:
    text = MIGRATION.read_text(encoding="utf-8")

    assert "CREATE EXTENSION IF NOT EXISTS postgis" in text
    assert "geometry(MultiPolygon, 4326)" in text
    assert "USING GIST(boundary)" in text
    assert "ST_Centroid(boundary)" in text
    assert "boundary JSON" not in text


def test_migration_models_separate_administrative_and_electoral_relationships() -> None:
    text = MIGRATION.read_text(encoding="utf-8")

    assert "administrative_contains" in text
    assert "electoral_overlap" in text
    assert "assembly_constituency" in text
    assert "parliamentary_constituency" in text


def test_historical_terms_and_relationships_include_validity() -> None:
    text = MIGRATION.read_text(encoding="utf-8")

    assert "CREATE TABLE IF NOT EXISTS representative_terms" in text
    assert "CREATE TABLE IF NOT EXISTS government_body_relationships" in text
    assert text.count("valid_from DATE") >= 10


def test_all_languages_migration_widens_language_check_constraints() -> None:
    migration = (
        Path(__file__).parents[1]
        / "alembic"
        / "versions"
        / "20260817_0005_all_local_languages.py"
    )
    text = migration.read_text(encoding="utf-8")

    assert "geography_aliases" in text
    assert "government_body_aliases" in text
    assert "public_office_aliases" in text
    assert "source_documents" in text
    # The widened constraint must accept every Eighth Schedule language code.
    eighth_schedule_codes = (
        '"as"',
        '"bn"',
        '"gu"',
        '"hi"',
        '"kn"',
        '"ml"',
        '"mr"',
        '"or"',
        '"pa"',
        '"ta"',
        '"ur"',
    )
    for code in eighth_schedule_codes:
        assert code in text
    # The widened upgrade constraint must no longer be restricted to en/te/und.
    assert "language_code IN ('en', 'te', 'und')" not in text.split("def downgrade")[0]
