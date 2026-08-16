from datetime import date
from typing import Literal
from uuid import UUID

from pydantic import HttpUrl

from app.models.enums import ReviewStatus
from app.schemas.common import APIModel
from app.schemas.schemes import LocalizedTextOut


class OfficeholderSourceOut(APIModel):
    source_record_id: UUID
    source_name: str
    official_source_url: HttpUrl
    public_source_url: HttpUrl | None = None
    retrieval_date: date
    review_status: ReviewStatus


class OfficeholderClaimOut[T](APIModel):
    classification: Literal["official"]
    value: T
    source: OfficeholderSourceOut


class OfficeholderRecordOut(APIModel):
    slug: str
    person_name: OfficeholderClaimOut[LocalizedTextOut]
    office_title: OfficeholderClaimOut[LocalizedTextOut]
    government_body: OfficeholderClaimOut[LocalizedTextOut]
    districts: OfficeholderClaimOut[list[LocalizedTextOut]]
    constituency: OfficeholderClaimOut[LocalizedTextOut]
    term_period: OfficeholderClaimOut[LocalizedTextOut]
    party: OfficeholderClaimOut[LocalizedTextOut] | None = None


class OfficeholderCatalogOut(APIModel):
    data: list[OfficeholderRecordOut]
    status: Literal["prepared-empty", "reviewed"]
    telugu_reviewed: bool = False
