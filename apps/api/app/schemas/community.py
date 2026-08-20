import uuid
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class CommunityParticipationStatusOut(BaseModel):
    submissions_enabled: bool
    mode: Literal["open", "read_only"]


class UserAccountCreate(BaseModel):
    username: str = Field(min_length=3, max_length=64)
    display_name: str = Field(min_length=2, max_length=128)
    district_id: uuid.UUID | None = None
    consent_data_sharing: bool = True
    consent_public_activity: bool = True
    preferred_language: str = "en"


class UserAccountOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    username: str
    display_name: str
    district_id: uuid.UUID | None = None
    consent_data_sharing: bool
    consent_public_activity: bool
    preferred_language: str
    created_at: datetime


class CommunityReportCreate(BaseModel):
    username: str
    entity_type: str
    entity_id: str | None = None
    district_id: uuid.UUID | None = None
    title_en: str
    title_te: str | None = None
    description_en: str
    description_te: str | None = None
    evidence_urls: list[str] = Field(default_factory=list)


class CommunityReportOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    username: str
    entity_type: str
    entity_id: str | None = None
    district_id: uuid.UUID | None = None
    title_en: str
    title_te: str | None = None
    description_en: str
    description_te: str | None = None
    classification: str
    evidence_urls: list[str]
    status: str
    created_at: datetime


class PollOption(BaseModel):
    id: str
    label_en: str
    label_te: str | None = None
    vote_count: int = 0


class CommunityPollOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title_en: str
    title_te: str | None = None
    description_en: str
    description_te: str | None = None
    entity_type: str | None = None
    entity_id: str | None = None
    options: list[PollOption]
    total_votes: int = 0
    is_active: bool
    non_representative_disclaimer: str = (
        "Non-representative Community Pulse — Opinions recorded here represent platform "
        "participants only and are NOT a statistically representative sample of Andhra Pradesh."
    )
    created_at: datetime


class PollVoteCreate(BaseModel):
    username: str
    poll_id: uuid.UUID
    option_id: str
    district_id: uuid.UUID | None = None


class PollVoteOut(BaseModel):
    id: uuid.UUID
    poll_id: uuid.UUID
    user_id: uuid.UUID
    option_id: str
    created_at: datetime


class CommunityCommentCreate(BaseModel):
    username: str
    target_type: str
    target_id: str
    rating: int | None = Field(default=None, ge=1, le=5)
    content_en: str
    content_te: str | None = None


class CommunityCommentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    username: str
    target_type: str
    target_id: str
    rating: int | None = None
    content_en: str
    content_te: str | None = None
    status: str
    created_at: datetime


class ModerationActionCreate(BaseModel):
    action: str = Field(pattern="^(approve|flag|hide|restore)$")
    target_type: str = Field(pattern="^(report|comment)$")
    target_id: uuid.UUID
    reason: str = Field(min_length=10, max_length=2000)


class AdminCommunityContentOut(BaseModel):
    """Pseudonymous community content visible only to authenticated administrators."""

    target_type: Literal["report", "comment"]
    target_id: uuid.UUID
    username: str
    summary_en: str
    summary_te: str | None = None
    detail_en: str | None = None
    detail_te: str | None = None
    classification: Literal["community_reported"] = "community_reported"
    status: str
    created_at: datetime


class ModerationAuditRecordOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    moderator_id: str
    action: str
    target_type: str
    target_id: str
    reason: str
    previous_state: dict[str, Any] | None = None
    new_state: dict[str, Any] | None = None
    created_at: datetime
