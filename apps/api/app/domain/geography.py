from datetime import date

from app.models.enums import GeographyRelationshipType, GeographyType

ADMINISTRATIVE_PARENT_TYPES: dict[GeographyType, set[GeographyType]] = {
    GeographyType.DISTRICT: {GeographyType.STATE},
    GeographyType.REVENUE_DIVISION: {GeographyType.DISTRICT},
    GeographyType.MANDAL: {GeographyType.REVENUE_DIVISION},
    GeographyType.VILLAGE: {GeographyType.MANDAL},
    GeographyType.URBAN_LOCAL_BODY: {GeographyType.DISTRICT},
}

ELECTORAL_TYPES = {
    GeographyType.ASSEMBLY_CONSTITUENCY,
    GeographyType.PARLIAMENTARY_CONSTITUENCY,
}


class InvalidGeographyRelationship(ValueError):
    pass


def validate_validity(valid_from: date | None, valid_to: date | None) -> None:
    if valid_from is not None and valid_to is not None and valid_to < valid_from:
        raise InvalidGeographyRelationship("valid_to cannot precede valid_from")


def validate_parent(child_type: GeographyType, parent_type: GeographyType | None) -> None:
    if child_type in ELECTORAL_TYPES and parent_type is not None:
        raise InvalidGeographyRelationship(
            "electoral entities cannot use the administrative parent hierarchy"
        )
    expected = ADMINISTRATIVE_PARENT_TYPES.get(child_type)
    if expected is None:
        if parent_type is not None:
            raise InvalidGeographyRelationship(
                f"{child_type.value} cannot have an administrative parent"
            )
        return
    if parent_type not in expected:
        allowed = ", ".join(sorted(item.value for item in expected))
        raise InvalidGeographyRelationship(
            f"{child_type.value} requires a parent of type: {allowed}"
        )


def validate_relationship(
    from_type: GeographyType,
    to_type: GeographyType,
    relationship_type: GeographyRelationshipType,
) -> None:
    if relationship_type in {
        GeographyRelationshipType.ELECTORAL_CONTAINS,
        GeographyRelationshipType.ELECTORAL_OVERLAP,
    } and not ({from_type, to_type} & ELECTORAL_TYPES):
        raise InvalidGeographyRelationship(
            "electoral relationships require at least one electoral entity"
        )
    if relationship_type is GeographyRelationshipType.ADMINISTRATIVE_CONTAINS and (
        from_type in ELECTORAL_TYPES or to_type in ELECTORAL_TYPES
    ):
        raise InvalidGeographyRelationship(
            "electoral entities cannot enter the administrative hierarchy"
        )
