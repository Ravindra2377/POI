"""Add index support for the published observation lookup paths.

Revision ID: 20260816_0003
Revises: 20260814_0002
Create Date: 2026-08-16

The public ``published_source_observations`` view and every repository query
that joins ``review_decisions`` or filters on ``observation_corrections``
previously had to scan those tables once per observation row, degrading to
quadratic cost as the catalogue grows. This revision adds the supporting
indexes so the latest-decision lookup, the correction exclusion, and the
review-chain guard all use index seeks.
"""

from collections.abc import Sequence

from alembic import op

revision: str = "20260816_0003"
down_revision: str | None = "20260814_0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

INDEX_STATEMENTS = (
    """
    CREATE INDEX ix_review_decisions_observation_id
    ON review_decisions (observation_id, decided_at DESC, created_at DESC, id DESC)
    """,
    """
    CREATE INDEX ix_observation_corrections_incorrect_observation_id
    ON observation_corrections (incorrect_observation_id)
    """,
    """
    CREATE INDEX ix_source_observations_published
    ON source_observations (review_state, is_published)
    """,
)

DROP_INDEX_STATEMENTS = (
    "DROP INDEX ix_review_decisions_observation_id",
    "DROP INDEX ix_observation_corrections_incorrect_observation_id",
    "DROP INDEX ix_source_observations_published",
)


def upgrade() -> None:
    for statement in INDEX_STATEMENTS:
        op.execute(statement)


def downgrade() -> None:
    for statement in DROP_INDEX_STATEMENTS:
        op.execute(statement)
