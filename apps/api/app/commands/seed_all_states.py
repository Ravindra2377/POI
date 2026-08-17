"""Operator command to seed all 36 States & Union Territories of India into PostgreSQL.

Seeds each State/UT as an official SourceRecord (state portal) and as a state
Geography with a reviewed LGD source reference. The Andhra Pradesh geography is
owned by the Stage 1 seed, so this command seeds geographies for the other 35.

Usage:
  python -m app.commands.seed_all_states
"""

import json
import sys
from dataclasses import dataclass
from datetime import UTC, datetime
from uuid import UUID, uuid5

from sqlalchemy.orm import Session

from app.db import get_session_factory
from app.ingestion.all_states import ALL_INDIA_STATES_UTS
from app.models.enums import (
    AccessMethod,
    AliasType,
    GeographyType,
    LanguageCode,
    ReviewStatus,
)
from app.models.geography import Geography, GeographyAlias
from app.models.provenance import SourceRecord
from app.models.source import SourceReference

STATES_NAMESPACE = UUID("b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e")
LGD_STATE_LIST_URL = "https://lgdirectory.gov.in/webservices/lgdws/stateList"


def _stable(key: str) -> UUID:
    return uuid5(STATES_NAMESPACE, key)


@dataclass(frozen=True)
class SeedStatesResult:
    """Counts from a state-and-UT seeding run."""

    source_records_created: int
    geographies_created: int
    aliases_created: int


def seed_states_and_uts(session: Session) -> SeedStatesResult:
    """Seed all 36 States and UTs as official SourceRecords and state geographies."""
    result = SeedStatesResult(0, 0, 0)
    today = datetime.now(UTC).date()

    for st in ALL_INDIA_STATES_UTS:
        source_id = _stable(f"state-source:{st.iso_code}")
        source = session.get(SourceRecord, source_id)
        if source is None:
            clean_domain = st.official_website.replace("https://", "").replace(
                "http://", ""
            )
            source = SourceRecord(
                id=source_id,
                name=f"Official Portal of {st.name_en}",
                publisher=f"Government of {st.name_en}",
                official_domain=clean_domain,
                source_type="state_portal",
                jurisdiction_code=st.iso_code,
                access_method=AccessMethod.HTML,
                active_from=today,
                review_status=ReviewStatus.REVIEWED,
            )
            session.add(source)
            result = SeedStatesResult(
                result.source_records_created + 1,
                result.geographies_created,
                result.aliases_created,
            )

        if st.iso_code == "IN-AP":
            # The Andhra Pradesh state geography is owned by the Stage 1 seed.
            continue

        geography_id = _stable(f"state-geography:{st.iso_code}")
        if session.get(Geography, geography_id) is not None:
            continue

        source_ref_id = _stable(f"state-source-ref:{st.iso_code}")
        source_ref = session.get(SourceReference, source_ref_id)
        if source_ref is None:
            source_ref = SourceReference(
                id=source_ref_id,
                source_name="Local Government Directory state list",
                official_source_url=LGD_STATE_LIST_URL,
                retrieval_date=today,
                publication_date=None,
                effective_date=None,
                review_status=ReviewStatus.REVIEWED,
                is_fixture=False,
                citation_metadata={
                    "lgd_state_code": st.lgd_code,
                    "iso_3166_2_code": st.iso_code,
                    "public_source_url": "https://lgdirectory.gov.in/",
                },
                notes=(
                    "Government of India LGD source for the state identifier. "
                    "Boundary was not imported; only the reviewed identifier is recorded."
                ),
            )
            session.add(source_ref)
            session.flush()

        geography = Geography(
            id=geography_id,
            slug=st.iso_code.lower(),
            entity_type=GeographyType.STATE,
            name_en=st.name_en,
            name_te=st.name_native if st.native_language == "te" else None,
            official_code=str(st.lgd_code),
            official_code_scheme="LGD state code",
            parent_id=None,
            valid_from=None,
            valid_to=None,
            is_active=True,
            is_pilot=False,
            coverage_note=(
                "Reviewed identifier from the LGD state list; native-language label "
                "retained as an alias in the state's official native language."
            ),
            point=None,
            boundary=None,
            boundary_precision=None,
            boundary_valid_from=None,
            boundary_valid_to=None,
            boundary_source_id=None,
            source_id=source_ref.id,
        )
        session.add(geography)
        session.flush()
        result = SeedStatesResult(
            result.source_records_created,
            result.geographies_created + 1,
            result.aliases_created,
        )

        if st.native_language != "te":
            alias_id = _stable(f"state-geography-alias:{st.iso_code}:{st.native_language}")
            session.add(
                GeographyAlias(
                    id=alias_id,
                    geography_id=geography.id,
                    alias=st.name_native,
                    language_code=LanguageCode(st.native_language),
                    alias_type=AliasType.ALTERNATE,
                    valid_from=None,
                    valid_to=None,
                    source_id=source_ref.id,
                )
            )
            session.flush()
            result = SeedStatesResult(
                result.source_records_created,
                result.geographies_created,
                result.aliases_created + 1,
            )

    session.flush()
    return result


def main() -> int:
    session_factory = get_session_factory()
    with session_factory() as session:
        result = seed_states_and_uts(session)
        session.commit()
        print(
            json.dumps(
                {
                    "status": "success",
                    "total_states_and_uts": len(ALL_INDIA_STATES_UTS),
                    "new_source_records_created": result.source_records_created,
                    "state_geographies_created": result.geographies_created,
                    "native_language_aliases_created": result.aliases_created,
                },
                indent=2,
            )
        )
    return 0


if __name__ == "__main__":
    sys.exit(main())
