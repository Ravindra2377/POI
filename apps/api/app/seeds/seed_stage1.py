import json
from datetime import UTC, date, datetime
from importlib.resources import files
from urllib.parse import urlsplit
from uuid import UUID, uuid5

from pydantic import BaseModel, ConfigDict
from sqlalchemy import inspect, select
from sqlalchemy.orm import Session

from app.models.enums import (
    AccessMethod,
    AliasType,
    GeographyRelationshipType,
    GeographyType,
    GovernmentBodyType,
    GovernmentRelationshipType,
    LanguageCode,
    ObservationReviewState,
    ReviewDecisionType,
    ReviewStatus,
    ValueClassification,
)
from app.models.geography import Geography, GeographyAlias, GeographyRelationship
from app.models.government import (
    Department,
    GovernmentBody,
    GovernmentBodyAlias,
    GovernmentBodyRelationship,
)
from app.models.provenance import (
    ReviewDecision,
    SourceDocument,
    SourceObservation,
    SourceRecord,
)
from app.models.source import SourceReference

SEED_NAMESPACE = UUID("a52ca50c-8f48-5da2-98aa-d82c74169fa4")
LGD_DISTRICT_URL = "https://lgdirectory.gov.in/webservices/lgdws/districtList"
AP_DISTRICT_URL = "https://www.ap.gov.in/api/api/Districts"
AP_ORGANISATION_URL = "https://www.ap.gov.in/api/api/ApOrganizations"


class StateSeed(BaseModel):
    slug: str
    name_en: str
    name_te: str
    code: str
    code_scheme: str
    source_url: str


class DistrictSeed(BaseModel):
    slug: str
    name_en: str
    name_te: str
    lgd_code: str
    ap_portal_code: str
    telugu_source_url: str
    aliases: list[str]
    is_pilot: bool


class DepartmentSeed(BaseModel):
    slug: str
    name_en: str
    name_te: str
    official_code: str
    sector: str
    portal_id: int
    aliases: list[str]


class SeedManifest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    stage: str
    reviewed_on: date
    baseline_effective_date: date
    state: StateSeed
    districts: list[DistrictSeed]
    departments: list[DepartmentSeed]


class SeedConflict(RuntimeError):
    pass


class SeedResult(BaseModel):
    sources_created: int = 0
    geographies_created: int = 0
    aliases_created: int = 0
    relationships_created: int = 0
    government_bodies_created: int = 0
    departments_created: int = 0


def stable_id(key: str) -> UUID:
    return uuid5(SEED_NAMESPACE, key)


def load_manifest() -> SeedManifest:
    resource = files("app.seeds").joinpath("stage1_seed.json")
    return SeedManifest.model_validate(json.loads(resource.read_text(encoding="utf-8")))


def _ensure_source_provenance(session: Session, source: SourceReference) -> None:
    """Create the Stage 2 compatibility chain without inventing a raw snapshot."""
    source_record = session.get(SourceRecord, source.id)
    if source_record is None:
        source_record = SourceRecord(
            id=source.id,
            name=source.source_name,
            publisher=source.source_name,
            official_domain=urlsplit(source.official_source_url).hostname or "unknown.invalid",
            source_type="stage1_reference",
            jurisdiction_code="IN-AP",
            access_method=AccessMethod.MANUAL,
            licence_status=None,
            reuse_status=None,
            active_from=source.effective_date,
            active_to=None,
            review_status=source.review_status,
            legacy_source_reference_id=source.id,
        )
        session.add(source_record)
        session.flush()
    elif source_record.legacy_source_reference_id != source.id:
        raise SeedConflict(f"source provenance {source.id} conflicts with the Stage 1 bridge")

    document = session.get(SourceDocument, source.id)
    if document is None:
        document = SourceDocument(
            id=source.id,
            source_id=source.id,
            official_url=source.official_source_url,
            title=source.source_name,
            publication_date=source.publication_date,
            reporting_period_start=source.effective_date,
            reporting_period_end=source.effective_date,
            document_type="stage1_reference",
            language_code=LanguageCode.UND,
            jurisdiction_code="IN-AP",
            document_metadata={
                "legacy_source_reference_id": str(source.id),
                "raw_snapshot_status": "unavailable_legacy_source_reference",
                "retrieval_date": source.retrieval_date.isoformat(),
                "citation_metadata": source.citation_metadata,
                "notes": source.notes,
                "is_fixture": source.is_fixture,
            },
        )
        session.add(document)
        session.flush()
    elif document.official_url != source.official_source_url:
        raise SeedConflict(f"source document {source.id} differs from the Stage 1 bridge")

    observation = session.get(SourceObservation, source.id)
    if observation is None:
        observation = SourceObservation(
            id=source.id,
            entity_type="source_reference",
            entity_id=source.id,
            field_path="legacy_reference",
            value_json={
                "source_name": source.source_name,
                "official_source_url": source.official_source_url,
                "retrieval_date": source.retrieval_date.isoformat(),
                "publication_date": (
                    source.publication_date.isoformat() if source.publication_date else None
                ),
                "effective_date": (
                    source.effective_date.isoformat() if source.effective_date else None
                ),
                "citation_metadata": source.citation_metadata,
                "notes": source.notes,
                "is_fixture": source.is_fixture,
            },
            document_id=source.id,
            legacy_source_reference_id=source.id,
            classification=ValueClassification.OFFICIAL,
            review_state=ObservationReviewState.PENDING,
            valid_from=source.effective_date,
            is_published=False,
        )
        session.add(observation)
        session.flush()

    decision = session.get(ReviewDecision, source.id)
    if decision is None:
        reviewed_at = datetime.combine(source.retrieval_date, datetime.min.time(), tzinfo=UTC)
        session.add(
            ReviewDecision(
                id=source.id,
                observation_id=source.id,
                reviewer_identity="system:stage2-legacy-backfill",
                decision=ReviewDecisionType.APPROVE,
                reason=(
                    "Imported from the explicit Stage 1 reviewed source reference; "
                    "raw bytes were not retained."
                ),
                decided_at=reviewed_at,
            )
        )
        session.flush()

    if (
        observation.review_state != ObservationReviewState.REVIEWED
        or not observation.is_published
    ):
        observation.review_state = ObservationReviewState.REVIEWED
        observation.is_published = True
        session.flush()


def _stage2_provenance_available(session: Session) -> bool:
    """Keep the Stage 1 seed runnable at its own migration revision."""
    cache_key = "stage2_provenance_available"
    cached = session.info.get(cache_key)
    if isinstance(cached, bool):
        return cached
    available = inspect(session.get_bind()).has_table("sources")
    session.info[cache_key] = available
    return available


def _ensure_source(
    session: Session,
    *,
    key: str,
    source_name: str,
    source_url: str,
    public_source_url: str | None = None,
    retrieval_date: date,
    effective_date: date | None,
    citation_metadata: dict[str, object],
    notes: str,
) -> tuple[SourceReference, bool]:
    if public_source_url:
        citation_metadata = {**citation_metadata, "public_source_url": public_source_url}
    source_id = stable_id(f"source:{key}")
    existing = session.get(SourceReference, source_id)
    if existing is not None:
        expected = (source_name, source_url, ReviewStatus.REVIEWED, False)
        actual = (
            existing.source_name,
            existing.official_source_url,
            existing.review_status,
            existing.is_fixture,
        )
        if actual != expected:
            raise SeedConflict(f"source {key} differs from the reviewed seed")
        if _stage2_provenance_available(session):
            _ensure_source_provenance(session, existing)
        return existing, False
    source = SourceReference(
        id=source_id,
        source_name=source_name,
        official_source_url=source_url,
        retrieval_date=retrieval_date,
        publication_date=None,
        effective_date=effective_date,
        review_status=ReviewStatus.REVIEWED,
        is_fixture=False,
        citation_metadata=citation_metadata,
        notes=notes,
    )
    session.add(source)
    session.flush()
    if _stage2_provenance_available(session):
        _ensure_source_provenance(session, source)
    return source, True


def _ensure_geography(
    session: Session,
    *,
    seed: StateSeed | DistrictSeed,
    entity_type: GeographyType,
    source: SourceReference,
    parent_id: UUID | None,
    valid_from: date | None,
    coverage_note: str | None = None,
) -> tuple[Geography, bool]:
    existing = session.scalar(select(Geography).where(Geography.slug == seed.slug))
    code = seed.code if isinstance(seed, StateSeed) else seed.lgd_code
    code_scheme = seed.code_scheme if isinstance(seed, StateSeed) else "LGD district code"
    is_pilot = seed.is_pilot if isinstance(seed, DistrictSeed) else False
    if existing is not None:
        expected = (
            entity_type,
            seed.name_en,
            seed.name_te,
            code,
            code_scheme,
            parent_id,
            source.id,
        )
        actual = (
            existing.entity_type,
            existing.name_en,
            existing.name_te,
            existing.official_code,
            existing.official_code_scheme,
            existing.parent_id,
            existing.source_id,
        )
        if actual != expected:
            raise SeedConflict(f"geography {seed.slug} differs from the reviewed seed")
        return existing, False
    geography = Geography(
        id=stable_id(f"geography:{seed.slug}"),
        slug=seed.slug,
        entity_type=entity_type,
        name_en=seed.name_en,
        name_te=seed.name_te,
        official_code=code,
        official_code_scheme=code_scheme,
        parent_id=parent_id,
        valid_from=valid_from,
        valid_to=None,
        is_active=True,
        is_pilot=is_pilot,
        coverage_note=coverage_note,
        point=None,
        boundary=None,
        boundary_precision=None,
        boundary_valid_from=None,
        boundary_valid_to=None,
        boundary_source_id=None,
        source_id=source.id,
    )
    session.add(geography)
    session.flush()
    return geography, True


def _ensure_geography_alias(
    session: Session, geography: Geography, value: str, source_id: UUID
) -> bool:
    existing = session.scalar(
        select(GeographyAlias).where(
            GeographyAlias.geography_id == geography.id,
            GeographyAlias.alias == value,
            GeographyAlias.language_code == LanguageCode.EN,
            GeographyAlias.alias_type == AliasType.ALTERNATE,
        )
    )
    if existing is not None:
        return False
    session.add(
        GeographyAlias(
            id=stable_id(f"geography-alias:{geography.slug}:{value.lower()}"),
            geography_id=geography.id,
            alias=value,
            language_code=LanguageCode.EN,
            alias_type=AliasType.ALTERNATE,
            valid_from=None,
            valid_to=None,
            source_id=source_id,
        )
    )
    return True


def _ensure_geography_relationship(
    session: Session,
    state: Geography,
    district: Geography,
    source_id: UUID,
    valid_from: date,
) -> bool:
    existing = session.scalar(
        select(GeographyRelationship).where(
            GeographyRelationship.from_geography_id == state.id,
            GeographyRelationship.to_geography_id == district.id,
            GeographyRelationship.relationship_type
            == GeographyRelationshipType.ADMINISTRATIVE_CONTAINS,
            GeographyRelationship.valid_from == valid_from,
        )
    )
    if existing is not None:
        return False
    session.add(
        GeographyRelationship(
            id=stable_id(f"geography-relationship:{state.slug}:{district.slug}"),
            from_geography_id=state.id,
            to_geography_id=district.id,
            relationship_type=GeographyRelationshipType.ADMINISTRATIVE_CONTAINS,
            valid_from=valid_from,
            valid_to=None,
            source_id=source_id,
            relationship_metadata={"seed_stage": "stage-01/geography"},
        )
    )
    return True


def _ensure_government_body(
    session: Session,
    *,
    slug: str,
    name_en: str,
    name_te: str,
    body_type: GovernmentBodyType,
    official_code: str | None,
    parent_id: UUID | None,
    source_id: UUID,
) -> tuple[GovernmentBody, bool]:
    existing = session.scalar(select(GovernmentBody).where(GovernmentBody.slug == slug))
    if existing is not None:
        expected = (name_en, name_te, body_type, official_code, parent_id, source_id)
        actual = (
            existing.name_en,
            existing.name_te,
            existing.body_type,
            existing.official_code,
            existing.parent_id,
            existing.source_id,
        )
        if actual != expected:
            raise SeedConflict(f"government body {slug} differs from the reviewed seed")
        return existing, False
    body = GovernmentBody(
        id=stable_id(f"government-body:{slug}"),
        slug=slug,
        body_type=body_type,
        name_en=name_en,
        name_te=name_te,
        official_code=official_code,
        parent_id=parent_id,
        valid_from=None,
        valid_to=None,
        is_active=True,
        source_id=source_id,
    )
    session.add(body)
    session.flush()
    return body, True


def seed_stage1(session: Session) -> SeedResult:
    manifest = load_manifest()
    result = SeedResult()
    state_source, created = _ensure_source(
        session,
        key="andhra-pradesh",
        source_name="Local Government Directory state list",
        source_url=manifest.state.source_url,
        public_source_url="https://lgdirectory.gov.in/",
        retrieval_date=manifest.reviewed_on,
        effective_date=None,
        citation_metadata={"state_code": manifest.state.code},
        notes="Government of India LGD source for the Andhra Pradesh state identifier.",
    )
    result.sources_created += int(created)
    state, created = _ensure_geography(
        session,
        seed=manifest.state,
        entity_type=GeographyType.STATE,
        source=state_source,
        parent_id=None,
        valid_from=None,
        coverage_note=(
            "Stage 1 includes the requested 26-district baseline. Markapuram and "
            "Polavaram are published separately by the network-ingestion district feed."
        ),
    )
    result.geographies_created += int(created)
    result.aliases_created += int(
        _ensure_geography_alias(session, state, "in-ap", state_source.id)
    )

    for district_seed in manifest.districts:
        district_source, created = _ensure_source(
            session,
            key=f"district:{district_seed.slug}",
            source_name=f"LGD district list and {district_seed.name_en} official portal",
            source_url=LGD_DISTRICT_URL,
            public_source_url=district_seed.telugu_source_url,
            retrieval_date=manifest.reviewed_on,
            effective_date=manifest.baseline_effective_date,
            citation_metadata={
                "request_method": "POST",
                "request_body": "stateCode=28",
                "lgd_code": district_seed.lgd_code,
                "ap_state_portal_url": AP_DISTRICT_URL,
                "ap_state_portal_code": district_seed.ap_portal_code,
                "telugu_name_source_url": district_seed.telugu_source_url,
                "current_lgd_district_count": 28,
                "seeded_baseline_count": 26,
            },
            notes=(
                "English name and national code reviewed against LGD; Telugu label reviewed "
                "against the linked official district portal. No boundary was imported."
            ),
        )
        result.sources_created += int(created)
        district, created = _ensure_geography(
            session,
            seed=district_seed,
            entity_type=GeographyType.DISTRICT,
            source=district_source,
            parent_id=state.id,
            valid_from=manifest.baseline_effective_date,
        )
        result.geographies_created += int(created)
        for alias in district_seed.aliases:
            result.aliases_created += int(
                _ensure_geography_alias(session, district, alias, district_source.id)
            )
        result.relationships_created += int(
            _ensure_geography_relationship(
                session,
                state,
                district,
                district_source.id,
                manifest.baseline_effective_date,
            )
        )

    department_source, created = _ensure_source(
        session,
        key="ap-organisations",
        source_name="Andhra Pradesh State Portal organisation directory",
        source_url=AP_ORGANISATION_URL,
        public_source_url="https://www.ap.gov.in/",
        retrieval_date=manifest.reviewed_on,
        effective_date=None,
        citation_metadata={
            "organisation_ids": [item.portal_id for item in manifest.departments],
            "scope": ["roads", "healthcare", "education"],
        },
        notes="Official AP State Portal names for the three Stage 1 sector departments.",
    )
    result.sources_created += int(created)
    state_body, created = _ensure_government_body(
        session,
        slug="government-of-andhra-pradesh",
        name_en="Government of Andhra Pradesh",
        name_te="ఆంధ్ర ప్రదేశ్ ప్రభుత్వం",
        body_type=GovernmentBodyType.STATE_GOVERNMENT,
        official_code=None,
        parent_id=None,
        source_id=department_source.id,
    )
    result.government_bodies_created += int(created)

    for department_seed in manifest.departments:
        body, created = _ensure_government_body(
            session,
            slug=department_seed.slug,
            name_en=department_seed.name_en,
            name_te=department_seed.name_te,
            body_type=GovernmentBodyType.DEPARTMENT,
            official_code=department_seed.official_code,
            parent_id=state_body.id,
            source_id=department_source.id,
        )
        result.government_bodies_created += int(created)
        department = session.scalar(
            select(Department).where(Department.government_body_id == body.id)
        )
        if department is None:
            session.add(
                Department(
                    id=stable_id(f"department:{department_seed.slug}"),
                    government_body_id=body.id,
                    sector=department_seed.sector,
                    source_id=department_source.id,
                )
            )
            result.departments_created += 1
        for alias_value in department_seed.aliases:
            alias = session.scalar(
                select(GovernmentBodyAlias).where(
                    GovernmentBodyAlias.government_body_id == body.id,
                    GovernmentBodyAlias.alias == alias_value,
                    GovernmentBodyAlias.language_code == LanguageCode.EN,
                    GovernmentBodyAlias.alias_type == AliasType.ALTERNATE,
                )
            )
            if alias is None:
                session.add(
                    GovernmentBodyAlias(
                        id=stable_id(f"government-body-alias:{body.slug}:{alias_value.lower()}"),
                        government_body_id=body.id,
                        alias=alias_value,
                        language_code=LanguageCode.EN,
                        alias_type=AliasType.ALTERNATE,
                        source_id=department_source.id,
                    )
                )
                result.aliases_created += 1
        relationship = session.scalar(
            select(GovernmentBodyRelationship).where(
                GovernmentBodyRelationship.from_body_id == state_body.id,
                GovernmentBodyRelationship.to_body_id == body.id,
                GovernmentBodyRelationship.relationship_type == GovernmentRelationshipType.PARENT,
                GovernmentBodyRelationship.valid_from.is_(None),
            )
        )
        if relationship is None:
            session.add(
                GovernmentBodyRelationship(
                    id=stable_id(f"government-relationship:{state_body.slug}:{body.slug}"),
                    from_body_id=state_body.id,
                    to_body_id=body.id,
                    relationship_type=GovernmentRelationshipType.PARENT,
                    valid_from=None,
                    valid_to=None,
                    source_id=department_source.id,
                )
            )
            result.relationships_created += 1

    session.flush()
    return result
