from datetime import date
from typing import Any
from uuid import UUID

from geoalchemy2 import Geometry
from geoalchemy2.elements import WKBElement
from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Computed,
    Date,
    Enum,
    ForeignKey,
    Index,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.enums import (
    AliasType,
    GeographyRelationshipType,
    GeographyType,
    LanguageCode,
    enum_values,
)
from app.models.source import SourceReference


class Geography(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "geographies"
    __table_args__ = (
        CheckConstraint(
            "valid_to IS NULL OR valid_from IS NULL OR valid_to >= valid_from",
            name="validity_order",
        ),
        CheckConstraint(
            "boundary_valid_to IS NULL OR boundary_valid_from IS NULL "
            "OR boundary_valid_to >= boundary_valid_from",
            name="boundary_validity_order",
        ),
        Index("ix_geographies_point_gist", "point", postgresql_using="gist"),
        Index("ix_geographies_boundary_gist", "boundary", postgresql_using="gist"),
    )

    slug: Mapped[str] = mapped_column(String(160), unique=True, nullable=False)
    entity_type: Mapped[GeographyType] = mapped_column(
        Enum(GeographyType, values_callable=enum_values, native_enum=False, length=40),
        index=True,
        nullable=False,
    )
    name_en: Mapped[str] = mapped_column(String(240), index=True, nullable=False)
    name_te: Mapped[str | None] = mapped_column(String(240), index=True)
    official_code: Mapped[str | None] = mapped_column(String(64), index=True)
    official_code_scheme: Mapped[str | None] = mapped_column(String(80))
    parent_id: Mapped[UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("geographies.id", ondelete="RESTRICT"), index=True
    )
    valid_from: Mapped[date | None] = mapped_column(Date)
    valid_to: Mapped[date | None] = mapped_column(Date)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, index=True)
    is_pilot: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    coverage_note: Mapped[str | None] = mapped_column(Text)
    point: Mapped[WKBElement | None] = mapped_column(
        Geometry("POINT", srid=4326, spatial_index=False)
    )
    boundary: Mapped[WKBElement | None] = mapped_column(
        Geometry("MULTIPOLYGON", srid=4326, spatial_index=False)
    )
    centroid: Mapped[WKBElement | None] = mapped_column(
        Geometry("POINT", srid=4326, spatial_index=False),
        Computed(
            "CASE WHEN boundary IS NULL THEN NULL ELSE ST_Centroid(boundary) END",
            persisted=True,
        ),
    )
    boundary_precision: Mapped[str | None] = mapped_column(String(80))
    boundary_valid_from: Mapped[date | None] = mapped_column(Date)
    boundary_valid_to: Mapped[date | None] = mapped_column(Date)
    boundary_source_id: Mapped[UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("source_references.id", ondelete="RESTRICT")
    )
    source_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("source_references.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    parent: Mapped["Geography | None"] = relationship(
        remote_side="Geography.id", back_populates="children", foreign_keys=[parent_id]
    )
    children: Mapped[list["Geography"]] = relationship(
        back_populates="parent", foreign_keys=[parent_id]
    )
    aliases: Mapped[list["GeographyAlias"]] = relationship(
        back_populates="geography", cascade="all, delete-orphan", lazy="selectin"
    )
    source: Mapped[SourceReference] = relationship(foreign_keys=[source_id], lazy="joined")
    boundary_source: Mapped[SourceReference | None] = relationship(
        foreign_keys=[boundary_source_id]
    )

    @property
    def has_point(self) -> bool:
        return self.point is not None

    @property
    def has_boundary(self) -> bool:
        return self.boundary is not None


class GeographyAlias(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "geography_aliases"
    __table_args__ = (
        UniqueConstraint("geography_id", "alias", "language_code", "alias_type", name="identity"),
        CheckConstraint(
            "valid_to IS NULL OR valid_from IS NULL OR valid_to >= valid_from",
            name="validity_order",
        ),
    )

    geography_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("geographies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    alias: Mapped[str] = mapped_column(String(240), nullable=False, index=True)
    language_code: Mapped[LanguageCode] = mapped_column(
        Enum(LanguageCode, values_callable=enum_values, native_enum=False, length=8), nullable=False
    )
    alias_type: Mapped[AliasType] = mapped_column(
        Enum(AliasType, values_callable=enum_values, native_enum=False, length=24), nullable=False
    )
    valid_from: Mapped[date | None] = mapped_column(Date)
    valid_to: Mapped[date | None] = mapped_column(Date)
    source_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("source_references.id", ondelete="RESTRICT"),
        nullable=False,
    )

    geography: Mapped[Geography] = relationship(back_populates="aliases")
    source: Mapped[SourceReference] = relationship(lazy="joined")


class GeographyRelationship(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "geography_relationships"
    __table_args__ = (
        UniqueConstraint(
            "from_geography_id",
            "to_geography_id",
            "relationship_type",
            "valid_from",
            name="identity",
        ),
        CheckConstraint("from_geography_id <> to_geography_id", name="different_entities"),
        CheckConstraint(
            "valid_to IS NULL OR valid_from IS NULL OR valid_to >= valid_from",
            name="validity_order",
        ),
    )

    from_geography_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("geographies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    to_geography_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("geographies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    relationship_type: Mapped[GeographyRelationshipType] = mapped_column(
        Enum(GeographyRelationshipType, values_callable=enum_values, native_enum=False, length=40),
        nullable=False,
    )
    valid_from: Mapped[date | None] = mapped_column(Date)
    valid_to: Mapped[date | None] = mapped_column(Date)
    source_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("source_references.id", ondelete="RESTRICT"),
        nullable=False,
    )
    relationship_metadata: Mapped[dict[str, Any]] = mapped_column(
        "metadata", JSONB, nullable=False, default=dict
    )

    source: Mapped[SourceReference] = relationship(lazy="joined")
