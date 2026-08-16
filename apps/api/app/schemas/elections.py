from datetime import date
from typing import Literal
from uuid import UUID

from pydantic import HttpUrl

from app.models.enums import ReviewStatus
from app.schemas.common import APIModel
from app.schemas.schemes import LocalizedTextOut


class ElectionResultSourceOut(APIModel):
    source_record_id: UUID
    source_name: str
    official_source_url: HttpUrl
    public_source_url: HttpUrl | None = None
    retrieval_date: date
    review_status: ReviewStatus


class ElectionResultClaimOut[T](APIModel):
    classification: Literal["official"]
    value: T
    source: ElectionResultSourceOut


class ElectionResultRecordOut(APIModel):
    slug: str
    term_id: int
    member_sl_no: str
    constituency_no: str
    reserved_category: str = ""
    member_name: ElectionResultClaimOut[LocalizedTextOut]
    constituency: ElectionResultClaimOut[LocalizedTextOut]
    district: ElectionResultClaimOut[LocalizedTextOut]
    party: ElectionResultClaimOut[LocalizedTextOut] | None = None
    term_period: ElectionResultClaimOut[LocalizedTextOut]
    elected_via: ElectionResultClaimOut[str]
    seat_status: ElectionResultClaimOut[str]
    annotation: ElectionResultClaimOut[LocalizedTextOut] | None = None


class ElectionResultCatalogOut(APIModel):
    data: list[ElectionResultRecordOut]
    status: Literal["prepared-empty", "reviewed"]
    telugu_reviewed: bool = False
