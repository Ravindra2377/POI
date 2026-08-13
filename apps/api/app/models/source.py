from datetime import date
from typing import Any

from sqlalchemy import Boolean, Date, Enum, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.enums import ReviewStatus


class SourceReference(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "source_references"

    source_name: Mapped[str] = mapped_column(String(240), nullable=False)
    official_source_url: Mapped[str] = mapped_column(Text, nullable=False)
    retrieval_date: Mapped[date] = mapped_column(Date, nullable=False)
    publication_date: Mapped[date | None] = mapped_column(Date)
    effective_date: Mapped[date | None] = mapped_column(Date)
    review_status: Mapped[ReviewStatus] = mapped_column(
        Enum(
            ReviewStatus,
            values_callable=lambda enum: [item.value for item in enum],
            native_enum=False,
            length=32,
        ),
        nullable=False,
    )
    is_fixture: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    citation_metadata: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    notes: Mapped[str | None] = mapped_column(Text)
