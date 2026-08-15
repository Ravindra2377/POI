from datetime import date
from typing import Literal
from uuid import UUID

from pydantic import HttpUrl

from app.models.enums import ReviewStatus
from app.schemas.common import APIModel


class LocalizedTextOut(APIModel):
    en: str
    te: str


class SchemeSourceOut(APIModel):
    """Provenance for one official scheme claim."""

    source_record_id: UUID
    source_name: str
    official_source_url: HttpUrl
    public_source_url: HttpUrl | None = None
    retrieval_date: date
    review_status: ReviewStatus


class SchemeClaimOut(APIModel):
    """An official single-value scheme claim with its source."""

    classification: Literal["official"]
    value: LocalizedTextOut
    source: SchemeSourceOut


class SchemeListClaimOut(APIModel):
    """An official multi-value scheme claim with its source."""

    classification: Literal["official"]
    value: list[LocalizedTextOut]
    source: SchemeSourceOut


class SchemeRecordOut(APIModel):
    """One reviewed Andhra Pradesh scheme with per-claim provenance."""

    slug: str
    name: SchemeClaimOut
    description: SchemeClaimOut
    category: SchemeClaimOut
    department: SchemeClaimOut | None = None
    districts: SchemeListClaimOut | None = None
    eligibility: SchemeListClaimOut | None = None


class SchemeCatalogOut(APIModel):
    data: list[SchemeRecordOut]
    status: Literal["prepared-empty", "reviewed"]
    telugu_reviewed: bool