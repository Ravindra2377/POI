"""Compose and publish representative, office, and constituency records from officeholder
observations.

Run from the repository root:

    python -m app.commands.ingest_representatives --reviewer "operator-name"

This adapter reads only already-reviewed, published officeholder observations
(stored by ``ingest_officeholders``) and materializes the normalized
``government`` schema rows behind the public directory. It never fetches
network data and creates no new review decisions; the reviewer identity is
echoed in the run summary for the operator log.
"""

import argparse
import json

from app.db import get_session_factory
from app.ingestion.representatives import (
    RepresentativeAdapterError,
    store_representatives,
)


def main() -> None:
    parser = argparse.ArgumentParser(
        description=(
            "Compose representative and public-office records from officeholder observations"
        ),
    )
    parser.add_argument(
        "--reviewer",
        required=True,
        help="identity of the operator running the composition",
    )
    args = parser.parse_args()

    if not args.reviewer.strip():
        raise RepresentativeAdapterError("--reviewer must name the operator running the command")

    with get_session_factory()() as session, session.begin():
        result = store_representatives(session, reviewer_identity=args.reviewer)

    print(
        json.dumps(
            {
                "government_bodies_created": result.government_bodies_created,
                "official_roles_created": result.official_roles_created,
                "representatives_created": result.representatives_created,
                "representative_terms_created": result.representative_terms_created,
                "public_offices_created": result.public_offices_created,
                "office_jurisdictions_created": result.office_jurisdictions_created,
                "geographies_created": result.geographies_created,
                "geography_relationships_created": result.geography_relationships_created,
                "reviewer": args.reviewer,
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()