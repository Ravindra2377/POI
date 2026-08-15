from datetime import datetime

from pydantic import HttpUrl

from app.models.enums import AccessMethod, ExtractionStatus, ReviewDecisionType, ReviewStatus
from app.schemas.common import APIModel


class FeedSourceOut(APIModel):
    name: str
    publisher: str
    official_source_url: HttpUrl
    public_source_url: HttpUrl | None = None
    access_method: AccessMethod
    review_status: ReviewStatus


class SnapshotOut(APIModel):
    sha256: str
    retrieved_at: datetime
    http_status: int
    content_type: str
    file_size_bytes: int


class ExtractionOut(APIModel):
    adapter_name: str
    adapter_version: str
    status: ExtractionStatus
    extracted_record_count: int
    software_revision: str


class ObservationCountsOut(APIModel):
    total: int
    published: int


class ReviewDecisionOut(APIModel):
    decision: ReviewDecisionType
    decided_at: datetime


class FeedStatusOut(APIModel):
    source: FeedSourceOut
    latest_snapshot: SnapshotOut | None = None
    latest_extraction: ExtractionOut | None = None
    observation_counts: ObservationCountsOut
    latest_review: ReviewDecisionOut | None = None
