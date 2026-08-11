from enum import StrEnum


class ReviewStatus(StrEnum):
    PENDING = "pending"
    REVIEWED = "reviewed"
    REJECTED = "rejected"


class GeographyType(StrEnum):
    STATE = "state"
    DISTRICT = "district"
    REVENUE_DIVISION = "revenue_division"
    MANDAL = "mandal"
    VILLAGE = "village"
    URBAN_LOCAL_BODY = "urban_local_body"
    ASSEMBLY_CONSTITUENCY = "assembly_constituency"
    PARLIAMENTARY_CONSTITUENCY = "parliamentary_constituency"


class AliasType(StrEnum):
    ALTERNATE = "alternate"
    HISTORICAL = "historical"


class LanguageCode(StrEnum):
    EN = "en"
    TE = "te"
    UND = "und"


class GeographyRelationshipType(StrEnum):
    ADMINISTRATIVE_CONTAINS = "administrative_contains"
    ELECTORAL_CONTAINS = "electoral_contains"
    ELECTORAL_OVERLAP = "electoral_overlap"
    COVERS = "covers"


class GovernmentBodyType(StrEnum):
    STATE_GOVERNMENT = "state_government"
    DEPARTMENT = "department"
    AGENCY = "agency"
    LOCAL_GOVERNMENT = "local_government"
    PUBLIC_SECTOR_BODY = "public_sector_body"


class GovernmentRelationshipType(StrEnum):
    PARENT = "parent"
    OVERSIGHT = "oversight"
    ATTACHED = "attached"
    PREDECESSOR = "predecessor"
    SUCCESSOR = "successor"


class AppointmentType(StrEnum):
    ELECTED = "elected"
    APPOINTED = "appointed"
    EX_OFFICIO = "ex_officio"
