from datetime import date
from typing import TypeVar
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, HttpUrl

from app.models.enums import AliasType, LanguageCode, ReviewStatus

T = TypeVar("T")


class APIModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class AliasSummary(APIModel):
    value: str
    language: LanguageCode
    kind: AliasType


class ProvenanceSummary(APIModel):
    source_id: UUID
    source_name: str
    official_source_url: HttpUrl
    public_source_url: HttpUrl | None = None
    retrieval_date: date
    publication_date: date | None = None
    effective_date: date | None = None
    review_status: ReviewStatus
    is_fixture: bool


class PageMeta(APIModel):
    page: int = Field(ge=1)
    page_size: int = Field(ge=1, le=100)
    total: int = Field(ge=0)
    total_pages: int = Field(ge=0)


class PageResponse[T](APIModel):
    data: list[T]
    meta: PageMeta


class ErrorDetail(APIModel):
    code: str
    message: str
    details: dict[str, str] | None = None


class ErrorResponse(APIModel):
    error: ErrorDetail
