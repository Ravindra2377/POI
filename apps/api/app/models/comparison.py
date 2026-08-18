import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    Enum,
    ForeignKey,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin
from app.models.enums import ComparisonKind, ComparisonVerdict, enum_values
from app.models.provenance import SourceObservation


class ClaimRecordComparison(Base, TimestampMixin):
    """A calculated pairing of an official claim with a recorded outcome.

    Both sides reference reviewed SourceObservations, so every comparison
    derives from audited source documents. The verdict is platform-calculated
    and never reported as an official government figure (ValueClassification
    CALCULATED semantics).
    """

    __tablename__ = "claim_record_comparisons"
    __table_args__ = (
        CheckConstraint(
            "verdict IN ('consistent', 'divergent', 'insufficient_data')",
            name="valid_verdict",
        ),
        CheckConstraint(
            "claim_value IS NOT NULL AND record_value IS NOT NULL "
            "OR verdict = 'insufficient_data'",
            name="values_for_verdict",
        ),
        CheckConstraint(
            "NOT is_published OR review_state = 'reviewed'",
            name="reviewed_before_publication",
        ),
        UniqueConstraint(
            "comparison_kind",
            "entity_type",
            "entity_id",
            name="comparison_identity",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True)
    comparison_kind: Mapped[str] = mapped_column(
        Enum(
            ComparisonKind,
            values_callable=enum_values,
            native_enum=False,
            length=48,
        ),
        nullable=False,
    )
    entity_type: Mapped[str] = mapped_column(String(80), nullable=False)
    entity_id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), nullable=False)
    entity_label_en: Mapped[str] = mapped_column(String(256), nullable=False)
    entity_label_te: Mapped[str] = mapped_column(String(256), default="", nullable=False)

    claim_observation_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("source_observations.id", ondelete="RESTRICT"),
        nullable=False,
    )
    claim_value: Mapped[Decimal | None] = mapped_column(Numeric)
    claim_label_en: Mapped[str] = mapped_column(String(256), nullable=False)
    claim_label_te: Mapped[str] = mapped_column(String(256), default="", nullable=False)

    record_observation_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("source_observations.id", ondelete="RESTRICT"),
        nullable=False,
    )
    record_value: Mapped[Decimal | None] = mapped_column(Numeric)
    record_label_en: Mapped[str] = mapped_column(String(256), nullable=False)
    record_label_te: Mapped[str] = mapped_column(String(256), default="", nullable=False)

    verdict: Mapped[str] = mapped_column(
        Enum(
            ComparisonVerdict,
            values_callable=enum_values,
            native_enum=False,
            length=24,
        ),
        nullable=False,
        index=True,
    )
    difference: Mapped[Decimal | None] = mapped_column(Numeric)
    difference_percent: Mapped[Decimal | None] = mapped_column(Numeric)
    tolerance_percent: Mapped[Decimal] = mapped_column(Numeric, nullable=False)
    method_en: Mapped[str] = mapped_column(Text, nullable=False)
    method_te: Mapped[str] = mapped_column(Text, default="", nullable=False)

    review_state: Mapped[str] = mapped_column(String(24), nullable=False, default="pending")
    reviewer_identity: Mapped[str | None] = mapped_column(String(240))
    decided_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    is_published: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    claim_observation: Mapped[SourceObservation] = relationship(
        "SourceObservation", foreign_keys=[claim_observation_id]
    )
    record_observation: Mapped[SourceObservation] = relationship(
        "SourceObservation", foreign_keys=[record_observation_id]
    )