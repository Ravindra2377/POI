import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, Index, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base
from app.models.enums import ReportStatus, ValueClassification


def utc_now() -> datetime:
    return datetime.now(UTC)


class UserAccount(Base):
    __tablename__ = "user_accounts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    display_name: Mapped[str] = mapped_column(String(128), nullable=False)
    district_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("geographies.id"), nullable=True, index=True
    )
    consent_data_sharing: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    consent_public_activity: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    preferred_language: Mapped[str] = mapped_column(String(10), default="en", nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )

    reports: Mapped[list["CommunityReport"]] = relationship(
        "CommunityReport", back_populates="user", cascade="all, delete-orphan"
    )
    votes: Mapped[list["PollVote"]] = relationship(
        "PollVote", back_populates="user", cascade="all, delete-orphan"
    )
    comments: Mapped[list["CommunityComment"]] = relationship(
        "CommunityComment", back_populates="user", cascade="all, delete-orphan"
    )


class StaffAccount(Base):
    __tablename__ = "staff_accounts"
    __table_args__ = (
        CheckConstraint(
            "role IN ('admin', 'moderator')", name="ck_staff_accounts_role"
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(320), unique=True, nullable=False, index=True)
    display_name: Mapped[str] = mapped_column(String(128), nullable=False)
    role: Mapped[str] = mapped_column(String(24), nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(Text, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, index=True)
    must_change_password: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    failed_login_attempts: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    locked_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_by_staff_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("staff_accounts.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False
    )


class StaffSession(Base):
    __tablename__ = "staff_sessions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    staff_account_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("staff_accounts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )
    last_used_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )


class CommunityReport(Base):
    __tablename__ = "community_reports"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("user_accounts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    entity_type: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    entity_id: Mapped[str | None] = mapped_column(String(256), nullable=True, index=True)
    district_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("geographies.id"), nullable=True, index=True
    )
    title_en: Mapped[str] = mapped_column(String(256), nullable=False)
    title_te: Mapped[str | None] = mapped_column(String(256), nullable=True)
    description_en: Mapped[str] = mapped_column(Text, nullable=False)
    description_te: Mapped[str | None] = mapped_column(Text, nullable=True)
    classification: Mapped[str] = mapped_column(
        String(32), default=ValueClassification.COMMUNITY_REPORTED.value, nullable=False
    )
    evidence_urls: Mapped[list[str]] = mapped_column(JSONB, default=list, nullable=False)
    status: Mapped[str] = mapped_column(
        String(32), default=ReportStatus.PENDING_REVIEW.value, nullable=False, index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False, index=True
    )

    user: Mapped["UserAccount"] = relationship("UserAccount", back_populates="reports")


class CommunityPoll(Base):
    __tablename__ = "community_polls"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title_en: Mapped[str] = mapped_column(String(256), nullable=False)
    title_te: Mapped[str | None] = mapped_column(String(256), nullable=True)
    description_en: Mapped[str] = mapped_column(Text, nullable=False)
    description_te: Mapped[str | None] = mapped_column(Text, nullable=True)
    entity_type: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    entity_id: Mapped[str | None] = mapped_column(String(256), nullable=True, index=True)
    options: Mapped[list[dict[str, Any]]] = mapped_column(JSONB, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )

    votes: Mapped[list["PollVote"]] = relationship(
        "PollVote", back_populates="poll", cascade="all, delete-orphan"
    )


class PollVote(Base):
    __tablename__ = "poll_votes"
    __table_args__ = (Index("ix_poll_votes_poll_user_unique", "poll_id", "user_id", unique=True),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    poll_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("community_polls.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("user_accounts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    option_id: Mapped[str] = mapped_column(String(64), nullable=False)
    district_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("geographies.id"), nullable=True, index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )

    poll: Mapped["CommunityPoll"] = relationship("CommunityPoll", back_populates="votes")
    user: Mapped["UserAccount"] = relationship("UserAccount", back_populates="votes")


class CommunityComment(Base):
    __tablename__ = "community_comments"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("user_accounts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    target_type: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    target_id: Mapped[str] = mapped_column(String(256), nullable=False, index=True)
    rating: Mapped[int | None] = mapped_column(Integer, nullable=True)
    content_en: Mapped[str] = mapped_column(Text, nullable=False)
    content_te: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(
        String(32), default=ReportStatus.PENDING_REVIEW.value, nullable=False, index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False, index=True
    )

    user: Mapped["UserAccount"] = relationship("UserAccount", back_populates="comments")


class ModerationAuditRecord(Base):
    __tablename__ = "moderation_audit_records"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    moderator_id: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    staff_account_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("staff_accounts.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    action: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    target_type: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    target_id: Mapped[str] = mapped_column(String(256), nullable=False, index=True)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    previous_state: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    new_state: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False, index=True
    )
