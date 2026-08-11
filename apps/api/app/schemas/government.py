from datetime import date
from uuid import UUID

from app.models.enums import GovernmentBodyType
from app.schemas.common import AliasSummary, APIModel, ProvenanceSummary


class GovernmentBodyOut(APIModel):
    id: UUID
    slug: str
    body_type: GovernmentBodyType
    name_en: str
    name_te: str | None
    official_code: str | None
    parent_id: UUID | None
    valid_from: date | None
    valid_to: date | None
    is_active: bool
    aliases: list[AliasSummary]
    sector: str | None = None
    provenance: ProvenanceSummary


class PublicOfficeOut(APIModel):
    id: UUID
    slug: str
    name_en: str
    name_te: str | None
    office_type: str
    official_code: str | None
    government_body_id: UUID
    valid_from: date | None
    valid_to: date | None
    is_active: bool
    has_point: bool
    provenance: ProvenanceSummary


class RepresentativeOut(APIModel):
    id: UUID
    slug: str
    name_en: str
    name_te: str | None
    valid_from: date | None
    valid_to: date | None
    is_active: bool
    provenance: ProvenanceSummary
