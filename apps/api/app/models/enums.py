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
    # 22 Eighth Schedule official languages of India
    AS = "as"  # Assamese
    BN = "bn"  # Bengali
    BRX = "brx"  # Bodo
    DOI = "doi"  # Dogri
    GU = "gu"  # Gujarati
    HI = "hi"  # Hindi
    KN = "kn"  # Kannada
    KS = "ks"  # Kashmiri
    KOK = "kok"  # Konkani
    MAI = "mai"  # Maithili
    ML = "ml"  # Malayalam
    MNI = "mni"  # Manipuri (Meitei)
    MR = "mr"  # Marathi
    NE = "ne"  # Nepali
    OR = "or"  # Odia
    PA = "pa"  # Punjabi
    SA = "sa"  # Sanskrit
    SAT = "sat"  # Santali
    SD = "sd"  # Sindhi
    TA = "ta"  # Tamil
    UR = "ur"  # Urdu
    # Widely used official languages outside the Eighth Schedule
    MZO = "mzo"  # Mizo
    UND = "und"


# All language codes that must persist in database columns and CHECK constraints.
ALL_LANGUAGE_CODE_VALUES = tuple(member.value for member in LanguageCode)


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


class ModerationAction(StrEnum):
    APPROVE = "approve"
    FLAG = "flag"
    HIDE = "hide"
    EDIT = "edit"
    RESTORE = "restore"


class ReportStatus(StrEnum):
    PENDING_REVIEW = "pending_review"
    PUBLISHED = "published"
    FLAGGED = "flagged"
    ARCHIVED = "archived"

