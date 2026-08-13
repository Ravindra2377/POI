from sqlalchemy import Enum

from app.models.base import Base
from app.models.enums import ReviewStatus
from app.seeds.seed_stage1 import (
    AP_DISTRICT_URL,
    LGD_DISTRICT_URL,
    load_manifest,
    stable_id,
)


def test_seed_manifest_has_reviewed_26_district_baseline() -> None:
    manifest = load_manifest()

    assert len(manifest.districts) == 26
    assert {item.slug for item in manifest.districts if item.is_pilot} == {
        "ananthapuramu",
        "guntur",
        "visakhapatnam",
    }
    assert all(item.name_te and item.lgd_code for item in manifest.districts)
    assert all(item.telugu_source_url.startswith("https://") for item in manifest.districts)


def test_seed_identifiers_are_deterministic_and_unique() -> None:
    manifest = load_manifest()
    identifiers = [stable_id(f"geography:{item.slug}") for item in manifest.districts]

    assert identifiers == [stable_id(f"geography:{item.slug}") for item in manifest.districts]
    assert len(set(identifiers)) == 26


def test_seed_sources_are_official_and_not_fixture_placeholders() -> None:
    manifest = load_manifest()

    assert LGD_DISTRICT_URL.startswith("https://lgdirectory.gov.in/")
    assert AP_DISTRICT_URL.startswith("https://www.ap.gov.in/")
    assert ReviewStatus.REVIEWED.value == "reviewed"
    assert all(".ap.gov.in/" in item.telugu_source_url for item in manifest.districts)


def test_all_orm_enums_use_database_values() -> None:
    enum_types = [
        column.type
        for table in Base.metadata.tables.values()
        for column in table.columns
        if isinstance(column.type, Enum)
    ]

    assert enum_types
    for enum_type in enum_types:
        enum_class = enum_type.enum_class
        assert enum_class is not None
        assert enum_type.enums == [member.value for member in enum_class]
