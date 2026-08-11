from datetime import date
from uuid import UUID

from app.models.enums import GeographyType
from app.schemas.common import AliasSummary, APIModel, ProvenanceSummary


class GeographyOut(APIModel):
    id: UUID
    slug: str
    entity_type: GeographyType
    name_en: str
    name_te: str | None
    official_code: str | None
    official_code_scheme: str | None
    parent_id: UUID | None
    valid_from: date | None
    valid_to: date | None
    is_active: bool
    is_pilot: bool
    aliases: list[AliasSummary]
    has_point: bool
    has_boundary: bool
    boundary_precision: str | None
    boundary_valid_from: date | None
    boundary_valid_to: date | None
    coverage_note: str | None
    provenance: ProvenanceSummary
