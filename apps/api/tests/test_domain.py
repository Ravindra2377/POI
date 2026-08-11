from datetime import date

import pytest

from app.domain.geography import (
    InvalidGeographyRelationship,
    validate_parent,
    validate_relationship,
    validate_validity,
)
from app.models.enums import GeographyRelationshipType, GeographyType


def test_administrative_hierarchy_accepts_district_under_state() -> None:
    validate_parent(GeographyType.DISTRICT, GeographyType.STATE)


def test_invalid_parent_relationship_is_rejected() -> None:
    with pytest.raises(InvalidGeographyRelationship):
        validate_parent(GeographyType.VILLAGE, GeographyType.DISTRICT)


def test_electoral_and_administrative_hierarchies_are_separate() -> None:
    with pytest.raises(InvalidGeographyRelationship):
        validate_parent(GeographyType.ASSEMBLY_CONSTITUENCY, GeographyType.DISTRICT)
    with pytest.raises(InvalidGeographyRelationship):
        validate_relationship(
            GeographyType.STATE,
            GeographyType.DISTRICT,
            GeographyRelationshipType.ELECTORAL_OVERLAP,
        )


def test_electoral_overlap_supports_cross_boundary_relationships() -> None:
    validate_relationship(
        GeographyType.ASSEMBLY_CONSTITUENCY,
        GeographyType.DISTRICT,
        GeographyRelationshipType.ELECTORAL_OVERLAP,
    )


def test_historical_validity_rejects_reversed_dates() -> None:
    with pytest.raises(InvalidGeographyRelationship):
        validate_validity(date(2026, 1, 2), date(2026, 1, 1))
