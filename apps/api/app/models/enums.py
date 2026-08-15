from enum import StrEnum


def enum_values(enum_class: type[StrEnum]) -> list[str]:
    """Persist public enum values rather than Python member names."""
    return [member.value for member in enum_class]


class ReviewStatus(StrEnum):
    PENDING = "pending"
    REVIEWED = "reviewed"
    REJECTED = "rejected"


class ValueClassification(StrEnum):
    OFFICIAL = "official"
    CALCULATED = "calculated"
    INFERRED = "inferred"
    COMMUNITY_REPORTED = "community_reported"


class AccessMethod(StrEnum):
    API = "api"
    HTML = "html"
    CSV = "csv"
    XLSX = "xlsx"
    PDF = "pdf"
    DASHBOARD = "dashboard"
    MANUAL = "manual"


class ExtractionStatus(StrEnum):
    PENDING = "pending"
    RUNNING = "running"
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    QUARANTINED = "quarantined"


class ObservationReviewState(StrEnum):
    PENDING = "pending"
    REVIEWED = "reviewed"
    REJECTED = "rejected"
    SUPERSEDED = "superseded"


class ReviewDecisionType(StrEnum):
    APPROVE = "approve"
    REJECT = "reject"
    REQUEST_CHANGES = "request_changes"


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
