from datetime import datetime
from decimal import Decimal
from typing import Literal
from uuid import UUID

from app.models.enums import ComparisonVerdict, ReviewStatus
from app.schemas.common import APIModel
from app.schemas.schemes import LocalizedTextOut


class ComparisonObservationOut(APIModel):
    """One side of a comparison: an official reviewed SourceObservation."""

    observation_id: UUID
    label: LocalizedTextOut
    value: LocalizedTextOut
    source_name: str
    official_source_url: str | None = None
    public_source_url: str | None = None
    review_status: ReviewStatus


class ClaimRecordComparisonOut(APIModel):
    """A calculated pairing of an official claim with a recorded outcome."""

    id: UUID
    comparison_kind: str
    entity_type: str
    entity_id: UUID
    entity_label: LocalizedTextOut
    verdict: ComparisonVerdict
    classification: Literal["calculated"] = "calculated"
    claim: ComparisonObservationOut
    record: ComparisonObservationOut
    difference: Decimal | None = None
    difference_percent: Decimal | None = None
    tolerance_percent: Decimal
    method: LocalizedTextOut
    reviewer_identity: str | None = None
    decided_at: datetime | None = None
    created_at: datetime


class ComparisonCatalogOut(APIModel):
    data: list[ClaimRecordComparisonOut]
    status: Literal["prepared-empty", "reviewed"]