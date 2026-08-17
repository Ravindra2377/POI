"""Compose normalized representative, office, and constituency records from published officeholder
observations.

The officeholder operators store the official AP Legislative Assembly member
report as reviewed, published observations. This adapter reads only those
already-reviewed observations and materializes the structured ``government``
schema rows the public directory needs: the Andhra Pradesh Legislative
Assembly body, one assembly-constituency geography per seat, one public office
per seat with its jurisdiction, the shared MLA official role, one
representative per person, and one time-bound representative term per person
per Assembly term.

Nothing here runs in a production request path and nothing fetches network
data: every output row references the same reviewed officeholder source record
the observations carry, so the public catalog's reviewed-source gate applies
unchanged. The adapter is idempotent and deterministic — re-running it creates
zero rows.
"""

import re
from dataclasses import dataclass
from datetime import date, datetime
from uuid import UUID, uuid5

from sqlalchemy import func, select
from sqlalchemy.orm import Session
from sqlalchemy.sql.selectable import Select

from app.ingestion.officeholders import (
    AP_LEGISLATURE_REPORT_URL,
    ASSEMBLY_TERMS,
    OFFICEHOLDER_INGESTION_NAMESPACE,
)
from app.models.enums import (
    AppointmentType,
    GeographyRelationshipType,
    GeographyType,
    GovernmentBodyType,
    ReviewStatus,
    ValueClassification,
)
from app.models.geography import Geography, GeographyRelationship
from app.models.government import (
    GovernmentBody,
    OfficeJurisdiction,
    OfficialRole,
    PublicOffice,
    Representative,
    RepresentativeTerm,
)
from app.models.provenance import SourceObservation, SourceRecord
from app.models.source import SourceReference

REPRESENTATIVES_NAMESPACE = UUID("b7a2c4d6-e8f0-4a1b-9c2d-3e4f5a6b7c8d")

ASSEMBLY_BODY_SLUG = "andhra-pradesh-legislative-assembly"
ASSEMBLY_BODY_NAME_EN = "Andhra Pradesh Legislative Assembly"
OFFICIAL_ROLE_SLUG = "member-of-legislative-assembly"
OFFICIAL_ROLE_NAME_EN = "Member of Legislative Assembly"
OFFICE_TYPE = "mla_assembly_constituency"

_PLACEHOLDER_CONSTITUENCY = {"NOMINATED", ""}
_CONSTITUTED_RE = re.compile(r"constituted\s+(\d{2}\.\d{2}\.\d{4})")
_TERM_PREFIX_RE = re.compile(r"^term(\d+)-")


class RepresentativeAdapterError(RuntimeError):
    """Raised when officeholder observations cannot be composed into records."""


@dataclass
class RepresentativeStoreResult:
    government_bodies_created: int = 0
    official_roles_created: int = 0
    representatives_created: int = 0
    representative_terms_created: int = 0
    public_offices_created: int = 0
    office_jurisdictions_created: int = 0
    geographies_created: int = 0
    geography_relationships_created: int = 0


def _stable(key: str) -> UUID:
    return uuid5(REPRESENTATIVES_NAMESPACE, key)


def _slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.casefold()).strip("-")
    return slug or "unknown"


def _parse_constituted_date(term_period_en: str) -> date | None:
    match = _CONSTITUTED_RE.search(term_period_en)
    if match is None:
        return None
    try:
        return datetime.strptime(match.group(1), "%d.%m.%Y").date()
    except ValueError:
        return None


def _parse_term_id(slug: str) -> int | None:
    match = _TERM_PREFIX_RE.match(slug)
    return int(match.group(1)) if match else None


def _is_placeholder_constituency(constituency_en: str) -> bool:
    return constituency_en.strip().upper() in _PLACEHOLDER_CONSTITUENCY


def _load_officeholder_groups(session: Session) -> list[dict[str, str]]:
    observations = session.scalars(
        select(SourceObservation)
        .where(
            SourceObservation.entity_type == "officeholder",
            SourceObservation.is_published.is_(True),
        )
        .order_by(SourceObservation.entity_id, SourceObservation.field_path)
    ).all()
    grouped: dict[UUID, dict[str, str]] = {}
    for observation in observations:
        grouped.setdefault(observation.entity_id, {})[observation.field_path] = (
            observation.value_text or ""
        )
    return [grouped[key] for key in sorted(grouped)]


def _officeholder_source_record(session: Session, term_id: int) -> SourceRecord:
    source_id = uuid5(
        OFFICEHOLDER_INGESTION_NAMESPACE,
        f"ingestion-source:ap-legislature-officeholders-term{term_id}",
    )
    source = session.get(SourceRecord, source_id)
    if source is None:
        raise RepresentativeAdapterError(
            f"officeholder source record for term {term_id} is missing; "
            "run ingest_officeholders --term N before composing representatives"
        )
    if source.review_status != ReviewStatus.REVIEWED:
        raise RepresentativeAdapterError(f"officeholder source for term {term_id} is not reviewed")
    return source


def _ensure_representative_source(
    session: Session, term_id: int, source_record: SourceRecord
) -> SourceReference:
    """Ensure a reviewed source_references row for the composed records.

    The government and geography tables reference ``source_references`` (the
    curated provenance view) rather than the ingestion ``sources`` table, so
    the adapter creates one reviewed reference per Assembly term, carrying the
    report label, retrieval date, and the underlying source record id.
    """
    reference_id = _stable(f"source-reference:ap-legislature-officeholders-term{term_id}")
    existing = session.get(SourceReference, reference_id)
    if existing is not None:
        return existing
    label = ASSEMBLY_TERMS[term_id][0] if term_id in ASSEMBLY_TERMS else f"Term {term_id}"
    source = SourceReference(
        id=reference_id,
        source_name=f"AP Legislative Assembly member report ({label})",
        official_source_url=AP_LEGISLATURE_REPORT_URL,
        retrieval_date=source_record.active_from or date.today(),
        publication_date=None,
        effective_date=None,
        review_status=ReviewStatus.REVIEWED,
        is_fixture=False,
        citation_metadata={
            "composition": "representative-adapter",
            "officeholder_source_record_id": str(source_record.id),
            "officeholder_source_name": source_record.name,
        },
        notes=(
            "Reviewed officeholder observations from the official AP Legislative Assembly "
            "member report, composed into normalized representative, office, and constituency "
            "records. The report is English-only, so Telugu labels are intentionally absent."
        ),
    )
    session.add(source)
    session.flush()
    return source


def _reviewed_source_ids() -> Select[tuple[UUID]]:
    return select(SourceReference.id).where(SourceReference.review_status == ReviewStatus.REVIEWED)


def _ensure_assembly_body(
    session: Session, source: SourceReference
) -> tuple[GovernmentBody, bool]:
    existing = session.scalar(
        select(GovernmentBody).where(GovernmentBody.slug == ASSEMBLY_BODY_SLUG)
    )
    if existing is not None:
        return existing, False
    state_body = session.scalar(
        select(GovernmentBody).where(
            GovernmentBody.slug == "government-of-andhra-pradesh",
            GovernmentBody.source_id.in_(_reviewed_source_ids()),
        )
    )
    body = GovernmentBody(
        id=_stable(f"government-body:{ASSEMBLY_BODY_SLUG}"),
        slug=ASSEMBLY_BODY_SLUG,
        body_type=GovernmentBodyType.STATE_GOVERNMENT,
        name_en=ASSEMBLY_BODY_NAME_EN,
        name_te=None,
        official_code=None,
        parent_id=state_body.id if state_body is not None else None,
        valid_from=None,
        valid_to=None,
        is_active=True,
        source_id=source.id,
    )
    session.add(body)
    session.flush()
    return body, True


def _ensure_official_role(
    session: Session, body: GovernmentBody, source: SourceReference
) -> tuple[OfficialRole, bool]:
    existing = session.scalar(select(OfficialRole).where(OfficialRole.slug == OFFICIAL_ROLE_SLUG))
    if existing is not None:
        return existing, False
    role = OfficialRole(
        id=_stable(f"official-role:{OFFICIAL_ROLE_SLUG}"),
        slug=OFFICIAL_ROLE_SLUG,
        name_en=OFFICIAL_ROLE_NAME_EN,
        name_te=None,
        government_body_id=body.id,
        public_office_id=None,
        valid_from=None,
        valid_to=None,
        source_id=source.id,
    )
    session.add(role)
    session.flush()
    return role, True


def _state_geography(session: Session) -> Geography | None:
    return session.scalar(
        select(Geography).where(
            Geography.slug == "andhra-pradesh",
            Geography.source_id.in_(_reviewed_source_ids()),
        )
    )


# The officeholder report predates the 2022 district reorganization, so it uses the
# legacy district names. Map them to the 26 post-reorganization district names.
DISTRICT_NAME_ALIASES: dict[str, str] = {
    "anantapur": "ananthapuramu",
    "ongole": "prakasam",
    "nellore": "sri-potti-sriramulu-nellore",
    "kadapa": "ysr-kadapa",
}


def _district_geography(session: Session, district_en: str) -> Geography | None:
    normalized = district_en.strip().casefold()
    if not normalized:
        return None
    alias = DISTRICT_NAME_ALIASES.get(normalized)
    candidate = alias or normalized
    return session.scalar(
        select(Geography).where(
            Geography.entity_type == GeographyType.DISTRICT,
            Geography.source_id.in_(_reviewed_source_ids()),
            func.lower(Geography.name_en) == candidate,
        )
    )


def _ensure_constituency_geography(
    session: Session,
    *,
    constituency_en: str,
    district_en: str,
    valid_from: date | None,
    source: SourceReference,
) -> tuple[Geography, bool]:
    slug = _slugify(constituency_en)
    existing = session.scalar(select(Geography).where(Geography.slug == slug))
    if existing is not None:
        return existing, False
    parent = _district_geography(session, district_en)
    if parent is None:
        parent = _state_geography(session)
    geography = Geography(
        id=_stable(f"geography:{slug}"),
        slug=slug,
        entity_type=GeographyType.ASSEMBLY_CONSTITUENCY,
        name_en=constituency_en.strip(),
        name_te=None,
        official_code=None,
        official_code_scheme=None,
        parent_id=parent.id if parent is not None else None,
        valid_from=valid_from,
        valid_to=None,
        is_active=True,
        is_pilot=False,
        coverage_note=(
            "Derived from the official AP Legislative Assembly member report; "
            "no electoral boundary was imported."
        ),
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


def _ensure_constituency_relationship(
    session: Session,
    *,
    constituency: Geography,
    valid_from: date | None,
    source: SourceReference,
) -> bool:
    parent = session.get(Geography, constituency.parent_id) if constituency.parent_id else None
    if parent is None or parent.entity_type != GeographyType.DISTRICT:
        return False
    existing = session.scalar(
        select(GeographyRelationship).where(
            GeographyRelationship.from_geography_id == parent.id,
            GeographyRelationship.to_geography_id == constituency.id,
            GeographyRelationship.relationship_type
            == GeographyRelationshipType.ELECTORAL_CONTAINS,
            GeographyRelationship.valid_from == valid_from,
        )
    )
    if existing is not None:
        return False
    session.add(
        GeographyRelationship(
            id=_stable(
                f"geography-relationship:{parent.slug}:{constituency.slug}:"
                f"{valid_from.isoformat() if valid_from else 'none'}"
            ),
            from_geography_id=parent.id,
            to_geography_id=constituency.id,
            relationship_type=GeographyRelationshipType.ELECTORAL_CONTAINS,
            valid_from=valid_from,
            valid_to=None,
            source_id=source.id,
            relationship_metadata={
                "origin": "representative-adapter/officeholder-observations",
                "classification": ValueClassification.OFFICIAL.value,
            },
        )
    )
    return True


def _ensure_public_office(
    session: Session,
    *,
    constituency_en: str,
    body: GovernmentBody,
    valid_from: date | None,
    source: SourceReference,
) -> tuple[PublicOffice, bool]:
    slug = f"mla-{_slugify(constituency_en)}"
    existing = session.scalar(select(PublicOffice).where(PublicOffice.slug == slug))
    if existing is not None:
        return existing, False
    office = PublicOffice(
        id=_stable(f"public-office:{slug}"),
        slug=slug,
        name_en=f"{OFFICIAL_ROLE_NAME_EN}, {constituency_en.strip()}",
        name_te=None,
        office_type=OFFICE_TYPE,
        official_code=None,
        government_body_id=body.id,
        parent_office_id=None,
        point=None,
        valid_from=valid_from,
        valid_to=None,
        is_active=True,
        source_id=source.id,
    )
    session.add(office)
    session.flush()
    return office, True


def _ensure_office_jurisdiction(
    session: Session,
    *,
    office: PublicOffice,
    constituency: Geography,
    valid_from: date | None,
    source: SourceReference,
) -> bool:
    existing = session.scalar(
        select(OfficeJurisdiction).where(
            OfficeJurisdiction.public_office_id == office.id,
            OfficeJurisdiction.geography_id == constituency.id,
            OfficeJurisdiction.valid_from == valid_from,
        )
    )
    if existing is not None:
        return False
    session.add(
        OfficeJurisdiction(
            id=_stable(
                f"office-jurisdiction:{office.slug}:{constituency.slug}:"
                f"{valid_from.isoformat() if valid_from else 'none'}"
            ),
            public_office_id=office.id,
            geography_id=constituency.id,
            valid_from=valid_from,
            valid_to=None,
            source_id=source.id,
        )
    )
    return True


def _unique_slug(base: str, used: set[str]) -> str:
    candidate = base
    suffix = 2
    while candidate in used:
        candidate = f"{base}-{suffix}"
        suffix += 1
    used.add(candidate)
    return candidate


def _ensure_representative(
    session: Session,
    *,
    person_name_en: str,
    valid_from: date | None,
    source: SourceReference,
    used_slugs: set[str],
    by_name: dict[str, Representative],
) -> tuple[Representative, bool]:
    name_key = person_name_en.strip().casefold()
    existing = by_name.get(name_key)
    if existing is None:
        existing = session.scalar(
            select(Representative).where(func.lower(Representative.name_en) == name_key)
        )
    if existing is not None:
        if valid_from is not None and (
            existing.valid_from is None or valid_from < existing.valid_from
        ):
            existing.valid_from = valid_from
        return existing, False
    slug = _unique_slug(_slugify(person_name_en), used_slugs)
    representative = Representative(
        id=_stable(f"representative:{slug}"),
        slug=slug,
        name_en=person_name_en.strip(),
        name_te=None,
        valid_from=valid_from,
        valid_to=None,
        is_active=True,
        source_id=source.id,
    )
    session.add(representative)
    session.flush()
    by_name[name_key] = representative
    return representative, True


def _ensure_representative_term(
    session: Session,
    *,
    representative: Representative,
    role: OfficialRole,
    constituency: Geography | None,
    body: GovernmentBody,
    valid_from: date,
    source: SourceReference,
) -> bool:
    existing = session.scalar(
        select(RepresentativeTerm).where(
            RepresentativeTerm.representative_id == representative.id,
            RepresentativeTerm.official_role_id == role.id,
            RepresentativeTerm.valid_from == valid_from,
        )
    )
    if existing is not None:
        return False
    session.add(
        RepresentativeTerm(
            id=_stable(f"representative-term:{representative.slug}:{valid_from.isoformat()}"),
            representative_id=representative.id,
            official_role_id=role.id,
            geography_id=constituency.id if constituency is not None else None,
            government_body_id=body.id,
            appointment_type=AppointmentType.ELECTED,
            valid_from=valid_from,
            valid_to=None,
            source_id=source.id,
        )
    )
    return True


def store_representatives(
    session: Session, *, reviewer_identity: str
) -> RepresentativeStoreResult:
    """Materialize representative, office, and constituency rows from published officeholder
    observations."""
    result = RepresentativeStoreResult()
    groups = _load_officeholder_groups(session)
    if not groups:
        return result

    first_term = _parse_term_id(groups[0].get("slug", ""))
    if first_term is None:
        raise RepresentativeAdapterError("officeholder observations carry no term prefix")
    first_source_record = _officeholder_source_record(session, first_term)
    first_source = _ensure_representative_source(session, first_term, first_source_record)
    body, body_created = _ensure_assembly_body(session, first_source)
    role, role_created = _ensure_official_role(session, body, first_source)
    result.government_bodies_created += int(body_created)
    result.official_roles_created += int(role_created)

    used_slugs: set[str] = set()
    by_name: dict[str, Representative] = {}
    for fields in groups:
        person_name = fields.get("person_name_en", "")
        constituency_en = fields.get("constituency_en", "")
        district_en = fields.get("district_en", "")
        term_period_en = fields.get("term_period_en", "")
        slug = fields.get("slug", "")
        term_id = _parse_term_id(slug)
        if term_id is None or not person_name.strip():
            continue
        source_record = _officeholder_source_record(session, term_id)
        source = _ensure_representative_source(session, term_id, source_record)
        constituted = _parse_constituted_date(term_period_en)

        representative, created = _ensure_representative(
            session,
            person_name_en=person_name,
            valid_from=constituted,
            source=source,
            used_slugs=used_slugs,
            by_name=by_name,
        )
        result.representatives_created += int(created)

        constituency: Geography | None = None
        if not _is_placeholder_constituency(constituency_en):
            constituency, constituency_created = _ensure_constituency_geography(
                session,
                constituency_en=constituency_en,
                district_en=district_en,
                valid_from=constituted,
                source=source,
            )
            result.geographies_created += int(constituency_created)
            result.geography_relationships_created += int(
                _ensure_constituency_relationship(
                    session,
                    constituency=constituency,
                    valid_from=constituted,
                    source=source,
                )
            )
            office, office_created = _ensure_public_office(
                session,
                constituency_en=constituency_en,
                body=body,
                valid_from=constituted,
                source=source,
            )
            result.public_offices_created += int(office_created)
            result.office_jurisdictions_created += int(
                _ensure_office_jurisdiction(
                    session,
                    office=office,
                    constituency=constituency,
                    valid_from=constituted,
                    source=source,
                )
            )

        if constituted is not None:
            result.representative_terms_created += int(
                _ensure_representative_term(
                    session,
                    representative=representative,
                    role=role,
                    constituency=constituency,
                    body=body,
                    valid_from=constituted,
                    source=source,
                )
            )
    session.flush()
    return result