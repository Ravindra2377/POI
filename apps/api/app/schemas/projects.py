from datetime import date
from typing import Literal
from uuid import UUID

from pydantic import HttpUrl

from app.models.enums import ReviewStatus
from app.schemas.common import APIModel
from app.schemas.schemes import LocalizedTextOut


class ProjectSourceOut(APIModel):
    source_record_id: UUID
    source_name: str
    official_source_url: HttpUrl
    public_source_url: HttpUrl | None = None
    retrieval_date: date
    review_status: ReviewStatus


class ProjectClaimOut[T](APIModel):
    classification: Literal["official"]
    value: T
    source: ProjectSourceOut


class ProjectRecordOut(APIModel):
    slug: str
    name: ProjectClaimOut[LocalizedTextOut]
    description: ProjectClaimOut[LocalizedTextOut]
    department: ProjectClaimOut[LocalizedTextOut]
    districts: ProjectClaimOut[list[LocalizedTextOut]]
    status: ProjectClaimOut[LocalizedTextOut]
    project_type: ProjectClaimOut[LocalizedTextOut]
    sanctioned_budget_inr: ProjectClaimOut[float] | None = None


class ProjectCatalogOut(APIModel):
    data: list[ProjectRecordOut]
    status: Literal["prepared-empty", "reviewed"]
    telugu_reviewed: bool = False
