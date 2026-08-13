from datetime import date
from uuid import UUID

from geoalchemy2 import Geometry
from geoalchemy2.elements import WKBElement
from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Date,
    Enum,
    ForeignKey,
    Index,
    String,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.enums import (
    AliasType,
    AppointmentType,
    GovernmentBodyType,
    GovernmentRelationshipType,
    LanguageCode,
    enum_values,
)
from app.models.source import SourceReference


class GovernmentBody(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "government_bodies"
    __table_args__ = (
        CheckConstraint(
            "valid_to IS NULL OR valid_from IS NULL OR valid_to >= valid_from",
            name="validity_order",
        ),
    )

    slug: Mapped[str] = mapped_column(String(160), unique=True, nullable=False)
    body_type: Mapped[GovernmentBodyType] = mapped_column(
        Enum(GovernmentBodyType, values_callable=enum_values, native_enum=False, length=40),
        nullable=False,
        index=True,
    )
    name_en: Mapped[str] = mapped_column(String(240), nullable=False, index=True)
    name_te: Mapped[str | None] = mapped_column(String(240), index=True)
    official_code: Mapped[str | None] = mapped_column(String(64), index=True)
    parent_id: Mapped[UUID | None] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("government_bodies.id", ondelete="RESTRICT"),
        index=True,
    )
    valid_from: Mapped[date | None] = mapped_column(Date)
    valid_to: Mapped[date | None] = mapped_column(Date)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, index=True)
    source_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("source_references.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    parent: Mapped["GovernmentBody | None"] = relationship(
        remote_side="GovernmentBody.id",
        back_populates="children",
        foreign_keys=[parent_id],
    )
    children: Mapped[list["GovernmentBody"]] = relationship(
        back_populates="parent", foreign_keys=[parent_id]
    )
    aliases: Mapped[list["GovernmentBodyAlias"]] = relationship(
        back_populates="government_body",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    source: Mapped[SourceReference] = relationship(lazy="joined")


class GovernmentBodyAlias(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "government_body_aliases"
    __table_args__ = (
        UniqueConstraint(
            "government_body_id", "alias", "language_code", "alias_type", name="identity"
        ),
    )

    government_body_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("government_bodies.id", ondelete="CASCADE"),
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
    source_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("source_references.id", ondelete="RESTRICT"),
        nullable=False,
    )

    government_body: Mapped[GovernmentBody] = relationship(back_populates="aliases")
    source: Mapped[SourceReference] = relationship(lazy="joined")


class Department(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "departments"

    government_body_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("government_bodies.id", ondelete="RESTRICT"),
        nullable=False,
        unique=True,
    )
    sector: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    source_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("source_references.id", ondelete="RESTRICT"),
        nullable=False,
    )

    government_body: Mapped[GovernmentBody] = relationship(lazy="joined")
    source: Mapped[SourceReference] = relationship(lazy="joined")


class GovernmentBodyRelationship(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "government_body_relationships"
    __table_args__ = (
        UniqueConstraint(
            "from_body_id", "to_body_id", "relationship_type", "valid_from", name="identity"
        ),
        CheckConstraint("from_body_id <> to_body_id", name="different_entities"),
        CheckConstraint(
            "valid_to IS NULL OR valid_from IS NULL OR valid_to >= valid_from",
            name="validity_order",
        ),
    )

    from_body_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("government_bodies.id", ondelete="CASCADE"),
        nullable=False,
    )
    to_body_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("government_bodies.id", ondelete="CASCADE"),
        nullable=False,
    )
    relationship_type: Mapped[GovernmentRelationshipType] = mapped_column(
        Enum(GovernmentRelationshipType, values_callable=enum_values, native_enum=False, length=32),
        nullable=False,
    )
    valid_from: Mapped[date | None] = mapped_column(Date)
    valid_to: Mapped[date | None] = mapped_column(Date)
    source_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("source_references.id", ondelete="RESTRICT"),
        nullable=False,
    )


class PublicOffice(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "public_offices"
    __table_args__ = (
        CheckConstraint(
            "valid_to IS NULL OR valid_from IS NULL OR valid_to >= valid_from",
            name="validity_order",
        ),
        Index("ix_public_offices_point_gist", "point", postgresql_using="gist"),
    )

    slug: Mapped[str] = mapped_column(String(160), unique=True, nullable=False)
    name_en: Mapped[str] = mapped_column(String(240), nullable=False, index=True)
    name_te: Mapped[str | None] = mapped_column(String(240), index=True)
    office_type: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    official_code: Mapped[str | None] = mapped_column(String(64), index=True)
    government_body_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("government_bodies.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    parent_office_id: Mapped[UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("public_offices.id", ondelete="RESTRICT")
    )
    point: Mapped[WKBElement | None] = mapped_column(
        Geometry("POINT", srid=4326, spatial_index=False)
    )
    valid_from: Mapped[date | None] = mapped_column(Date)
    valid_to: Mapped[date | None] = mapped_column(Date)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    source_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("source_references.id", ondelete="RESTRICT"),
        nullable=False,
    )

    aliases: Mapped[list["PublicOfficeAlias"]] = relationship(
        back_populates="public_office", cascade="all, delete-orphan", lazy="selectin"
    )
    government_body: Mapped[GovernmentBody] = relationship(lazy="joined")
    source: Mapped[SourceReference] = relationship(lazy="joined")


class OfficeJurisdiction(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "office_jurisdictions"
    __table_args__ = (
        UniqueConstraint("public_office_id", "geography_id", "valid_from", name="identity"),
        CheckConstraint(
            "valid_to IS NULL OR valid_from IS NULL OR valid_to >= valid_from",
            name="validity_order",
        ),
    )

    public_office_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("public_offices.id", ondelete="CASCADE"),
        nullable=False,
    )
    geography_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("geographies.id", ondelete="CASCADE"),
        nullable=False,
    )
    valid_from: Mapped[date | None] = mapped_column(Date)
    valid_to: Mapped[date | None] = mapped_column(Date)
    source_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("source_references.id", ondelete="RESTRICT"),
        nullable=False,
    )


class OfficialRole(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "official_roles"
    __table_args__ = (
        CheckConstraint(
            "valid_to IS NULL OR valid_from IS NULL OR valid_to >= valid_from",
            name="validity_order",
        ),
    )

    slug: Mapped[str] = mapped_column(String(160), unique=True, nullable=False)
    name_en: Mapped[str] = mapped_column(String(240), nullable=False)
    name_te: Mapped[str | None] = mapped_column(String(240))
    government_body_id: Mapped[UUID | None] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("government_bodies.id", ondelete="RESTRICT"),
    )
    public_office_id: Mapped[UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("public_offices.id", ondelete="RESTRICT")
    )
    valid_from: Mapped[date | None] = mapped_column(Date)
    valid_to: Mapped[date | None] = mapped_column(Date)
    source_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("source_references.id", ondelete="RESTRICT"),
        nullable=False,
    )


class Representative(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "representatives"
    __table_args__ = (
        CheckConstraint(
            "valid_to IS NULL OR valid_from IS NULL OR valid_to >= valid_from",
            name="validity_order",
        ),
    )

    slug: Mapped[str] = mapped_column(String(160), unique=True, nullable=False)
    name_en: Mapped[str] = mapped_column(String(240), nullable=False, index=True)
    name_te: Mapped[str | None] = mapped_column(String(240), index=True)
    valid_from: Mapped[date | None] = mapped_column(Date)
    valid_to: Mapped[date | None] = mapped_column(Date)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    source_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("source_references.id", ondelete="RESTRICT"),
        nullable=False,
    )

    source: Mapped[SourceReference] = relationship(lazy="joined")


class RepresentativeTerm(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "representative_terms"
    __table_args__ = (
        UniqueConstraint("representative_id", "official_role_id", "valid_from", name="identity"),
        CheckConstraint("valid_to IS NULL OR valid_to >= valid_from", name="validity_order"),
    )

    representative_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("representatives.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    official_role_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("official_roles.id", ondelete="RESTRICT"),
        nullable=False,
    )
    geography_id: Mapped[UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("geographies.id", ondelete="RESTRICT")
    )
    government_body_id: Mapped[UUID | None] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("government_bodies.id", ondelete="RESTRICT"),
    )
    appointment_type: Mapped[AppointmentType] = mapped_column(
        Enum(AppointmentType, values_callable=enum_values, native_enum=False, length=24),
        nullable=False,
    )
    valid_from: Mapped[date] = mapped_column(Date, nullable=False)
    valid_to: Mapped[date | None] = mapped_column(Date)
    source_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("source_references.id", ondelete="RESTRICT"),
        nullable=False,
    )


class PublicOfficeAlias(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "public_office_aliases"
    __table_args__ = (
        UniqueConstraint(
            "public_office_id", "alias", "language_code", "alias_type", name="identity"
        ),
    )

    public_office_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("public_offices.id", ondelete="CASCADE"),
        nullable=False,
    )
    alias: Mapped[str] = mapped_column(String(240), nullable=False, index=True)
    language_code: Mapped[LanguageCode] = mapped_column(
        Enum(LanguageCode, values_callable=enum_values, native_enum=False, length=8), nullable=False
    )
    alias_type: Mapped[AliasType] = mapped_column(
        Enum(AliasType, values_callable=enum_values, native_enum=False, length=24), nullable=False
    )
    source_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("source_references.id", ondelete="RESTRICT"),
        nullable=False,
    )
    public_office: Mapped[PublicOffice] = relationship(back_populates="aliases")
