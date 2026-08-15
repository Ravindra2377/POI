from datetime import date
from typing import Literal
from uuid import UUID

from pydantic import HttpUrl

from app.models.enums import ReviewStatus
from app.schemas.common import APIModel
from app.schemas.schemes import LocalizedTextOut


class ProcurementSourceOut(APIModel):
    source_record_id: UUID
    source_name: str
    official_source_url: HttpUrl
    public_source_url: HttpUrl | None = None
    retrieval_date: date
    review_status: ReviewStatus


class ProcurementClaimOut[T](APIModel):
    classification: Literal["official"]
    value: T
    source: ProcurementSourceOut


class ProcurementRecordOut(APIModel):
    slug: str
    title: ProcurementClaimOut[LocalizedTextOut]
    stage: ProcurementClaimOut[LocalizedTextOut]
    description: ProcurementClaimOut[LocalizedTextOut]
    department: ProcurementClaimOut[LocalizedTextOut]
    districts: ProcurementClaimOut[list[LocalizedTextOut]]
    contractor: ProcurementClaimOut[LocalizedTextOut] | None = None
    contract_value_inr: ProcurementClaimOut[float] | None = None


class ProcurementCatalogOut(APIModel):
    data: list[ProcurementRecordOut]
    status: Literal["prepared-empty", "reviewed"]
    telugu_reviewed: bool = False
