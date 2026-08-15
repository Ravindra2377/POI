from datetime import date, datetime
from decimal import Decimal
from typing import Any
from uuid import UUID

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.enums import (
    AccessMethod,
    ExtractionStatus,
    LanguageCode,
    ObservationReviewState,
    ReviewDecisionType,
    ReviewStatus,
    ValueClassification,
    enum_values,
)


class SourceRecord(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """A registered publisher/source; Stage 1 source UUIDs are retained here."""

    __tablename__ = "sources"
    __table_args__ = (
        CheckConstraint(
            "active_to IS NULL OR active_from IS NULL OR active_to >= active_from",
            name="active_period",
        ),
    )

    name: Mapped[str] = mapped_column(String(240), nullable=False)
    publisher: Mapped[str] = mapped_column(String(240), nullable=False)
    official_domain: Mapped[str] = mapped_column(String(253), nullable=False)
    source_type: Mapped[str] = mapped_column(String(80), nullable=False)
    jurisdiction_code: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    access_method: Mapped[AccessMethod] = mapped_column(
        Enum(AccessMethod, values_callable=enum_values, native_enum=False, length=24),
        nullable=False,
    )
    licence_status: Mapped[str | None] = mapped_column(String(120))
    reuse_status: Mapped[str | None] = mapped_column(String(120))
    active_from: Mapped[date | None] = mapped_column(Date)
    active_to: Mapped[date | None] = mapped_column(Date)
    review_status: Mapped[ReviewStatus] = mapped_column(
        Enum(ReviewStatus, values_callable=enum_values, native_enum=False, length=32),
        nullable=False,
    )
    legacy_source_reference_id: Mapped[UUID | None] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("source_references.id", ondelete="RESTRICT"),
        unique=True,
    )


class SourceDocument(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Stable identity for an official document or endpoint response series."""

    __tablename__ = "source_documents"
    __table_args__ = (
        CheckConstraint(
            "reporting_period_end IS NULL OR reporting_period_start IS NULL "
            "OR reporting_period_end >= reporting_period_start",
            name="reporting_period",
        ),
        UniqueConstraint("source_id", "official_url", name="source_url"),
    )

    source_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("sources.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    official_url: Mapped[str] = mapped_column(Text, nullable=False)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    publication_date: Mapped[date | None] = mapped_column(Date)
    reporting_period_start: Mapped[date | None] = mapped_column(Date)
    reporting_period_end: Mapped[date | None] = mapped_column(Date)
    document_type: Mapped[str] = mapped_column(String(80), nullable=False)
    language_code: Mapped[LanguageCode] = mapped_column(
        Enum(LanguageCode, values_callable=enum_values, native_enum=False, length=8),
        nullable=False,
    )
    jurisdiction_code: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    document_metadata: Mapped[dict[str, Any]] = mapped_column(
        "metadata", JSONB, nullable=False, default=dict
    )

    source: Mapped[SourceRecord] = relationship(lazy="joined")


class SourceSnapshot(UUIDPrimaryKeyMixin, Base):
    """Immutable metadata for raw bytes stored outside PostgreSQL."""

    __tablename__ = "source_snapshots"
    __table_args__ = (
        CheckConstraint("file_size_bytes >= 0", name="nonnegative_file_size"),
        CheckConstraint("sha256 ~ '^[0-9a-f]{64}$'", name="sha256_format"),
        UniqueConstraint("document_id", "sha256", name="document_checksum"),
        Index("ix_source_snapshots_sha256", "sha256"),
    )

    document_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("source_documents.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    retrieved_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    http_status: Mapped[int] = mapped_column(nullable=False)
    content_type: Mapped[str] = mapped_column(String(255), nullable=False)
    file_size_bytes: Mapped[int] = mapped_column(BigInteger, nullable=False)
    sha256: Mapped[str] = mapped_column(String(64), nullable=False)
    object_storage_key: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    original_filename: Mapped[str | None] = mapped_column(String(500))
    retrieval_metadata: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    duplicate_of_snapshot_id: Mapped[UUID | None] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("source_snapshots.id", ondelete="RESTRICT"),
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


class ExtractionRun(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "extraction_runs"
    __table_args__ = (
        CheckConstraint(
            "completed_at IS NULL OR completed_at >= started_at",
            name="completion_order",
        ),
        CheckConstraint("extracted_record_count >= 0", name="nonnegative_record_count"),
        UniqueConstraint(
            "snapshot_id", "adapter_name", "adapter_version", "software_revision", name="identity"
        ),
    )

    snapshot_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("source_snapshots.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    adapter_name: Mapped[str] = mapped_column(String(160), nullable=False)
    adapter_version: Mapped[str] = mapped_column(String(80), nullable=False)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    status: Mapped[ExtractionStatus] = mapped_column(
        Enum(ExtractionStatus, values_callable=enum_values, native_enum=False, length=24),
        nullable=False,
    )
    error_summary: Mapped[str | None] = mapped_column(Text)
    extracted_record_count: Mapped[int] = mapped_column(nullable=False, default=0)
    parser_configuration: Mapped[dict[str, Any]] = mapped_column(
        JSONB, nullable=False, default=dict
    )
    software_revision: Mapped[str] = mapped_column(String(80), nullable=False)


class SourceObservation(UUIDPrimaryKeyMixin, Base):
    """Typed claim with immutable values and audited review/publication state."""

    __tablename__ = "source_observations"
    __table_args__ = (
        CheckConstraint(
            "(legacy_source_reference_id IS NOT NULL AND snapshot_id IS NULL "
            "AND extraction_run_id IS NULL) OR "
            "(legacy_source_reference_id IS NULL AND snapshot_id IS NOT NULL "
            "AND extraction_run_id IS NOT NULL)",
            name="provenance_origin",
        ),
        CheckConstraint(
            "num_nonnulls(value_text, value_number, value_boolean, value_date, value_json) = 1",
            name="single_value",
        ),
        CheckConstraint(
            "reporting_period_end IS NULL OR reporting_period_start IS NULL "
            "OR reporting_period_end >= reporting_period_start",
            name="reporting_period",
        ),
        CheckConstraint(
            "valid_to IS NULL OR valid_from IS NULL OR valid_to >= valid_from",
            name="validity_period",
        ),
        CheckConstraint(
            "confidence IS NULL OR (confidence >= 0 AND confidence <= 1)",
            name="confidence_range",
        ),
        CheckConstraint(
            "NOT is_published OR review_state = 'reviewed'",
            name="reviewed_before_publication",
        ),
        UniqueConstraint(
            "entity_type", "entity_id", "field_path", "document_id", name="legacy_identity"
        ),
        Index("ix_source_observations_entity", "entity_type", "entity_id"),
    )

    entity_type: Mapped[str] = mapped_column(String(80), nullable=False)
    entity_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), nullable=False)
    field_path: Mapped[str] = mapped_column(String(240), nullable=False)
    value_text: Mapped[str | None] = mapped_column(Text)
    value_number: Mapped[Decimal | None] = mapped_column(Numeric)
    value_boolean: Mapped[bool | None] = mapped_column(Boolean)
    value_date: Mapped[date | None] = mapped_column(Date)
    value_json: Mapped[dict[str, Any] | list[Any] | None] = mapped_column(JSONB)
    unit: Mapped[str | None] = mapped_column(String(80))
    reporting_period_start: Mapped[date | None] = mapped_column(Date)
    reporting_period_end: Mapped[date | None] = mapped_column(Date)
    geography_id: Mapped[UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("geographies.id", ondelete="RESTRICT")
    )
    document_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("source_documents.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    snapshot_id: Mapped[UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("source_snapshots.id", ondelete="RESTRICT")
    )
    extraction_run_id: Mapped[UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("extraction_runs.id", ondelete="RESTRICT")
    )
    legacy_source_reference_id: Mapped[UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("source_references.id", ondelete="RESTRICT")
    )
    classification: Mapped[ValueClassification] = mapped_column(
        Enum(ValueClassification, values_callable=enum_values, native_enum=False, length=32),
        nullable=False,
    )
    confidence: Mapped[Decimal | None] = mapped_column(Numeric(5, 4))
    review_state: Mapped[ObservationReviewState] = mapped_column(
        Enum(
            ObservationReviewState,
            values_callable=enum_values,
            native_enum=False,
            length=24,
        ),
        nullable=False,
    )
    valid_from: Mapped[date | None] = mapped_column(Date)
    valid_to: Mapped[date | None] = mapped_column(Date)
    is_published: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


class ReviewDecision(UUIDPrimaryKeyMixin, Base):
    """Immutable audit record for a human or migration review action."""

    __tablename__ = "review_decisions"
    __table_args__ = (
        CheckConstraint(
            "(observation_id IS NOT NULL)::int + (extraction_run_id IS NOT NULL)::int = 1",
            name="single_target",
        ),
        Index(
            "uq_review_decisions_previous",
            "previous_decision_id",
            unique=True,
            postgresql_where=text("previous_decision_id IS NOT NULL"),
        ),
        Index(
            "uq_review_decisions_observation_root",
            "observation_id",
            unique=True,
            postgresql_where=text(
                "previous_decision_id IS NULL AND observation_id IS NOT NULL"
            ),
        ),
        Index(
            "uq_review_decisions_extraction_root",
            "extraction_run_id",
            unique=True,
            postgresql_where=text(
                "previous_decision_id IS NULL AND extraction_run_id IS NOT NULL"
            ),
        ),
    )

    observation_id: Mapped[UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("source_observations.id", ondelete="RESTRICT")
    )
    extraction_run_id: Mapped[UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("extraction_runs.id", ondelete="RESTRICT")
    )
    reviewer_identity: Mapped[str] = mapped_column(String(240), nullable=False)
    decision: Mapped[ReviewDecisionType] = mapped_column(
        Enum(ReviewDecisionType, values_callable=enum_values, native_enum=False, length=24),
        nullable=False,
    )
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    decided_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    previous_decision_id: Mapped[UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("review_decisions.id", ondelete="RESTRICT")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


class Correction(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "observation_corrections"
    __table_args__ = (
        CheckConstraint(
            "incorrect_observation_id <> superseding_observation_id",
            name="different_observations",
        ),
        UniqueConstraint("incorrect_observation_id", name="one_superseding_observation"),
    )

    incorrect_observation_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("source_observations.id", ondelete="RESTRICT"),
        nullable=False,
    )
    superseding_observation_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("source_observations.id", ondelete="RESTRICT"),
        nullable=False,
    )
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    review_decision_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("review_decisions.id", ondelete="RESTRICT"),
        nullable=False,
    )
    corrected_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
