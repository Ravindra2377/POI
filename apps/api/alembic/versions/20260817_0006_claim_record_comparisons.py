"""Add claim_record_comparisons table for calculated claims-vs-records pairs.

Revision ID: 20260817_0006
Revises: 20260817_0005
Create Date: 2026-08-17
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "20260817_0006"
down_revision: str | None = "20260817_0005"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "claim_record_comparisons",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "comparison_kind", sa.String(length=48), nullable=False
        ),
        sa.Column("entity_type", sa.String(length=80), nullable=False),
        sa.Column("entity_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("entity_label_en", sa.String(length=256), nullable=False),
        sa.Column(
            "entity_label_te",
            sa.String(length=256),
            nullable=False,
            server_default="",
        ),
        sa.Column(
            "claim_observation_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("source_observations.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("claim_value", sa.Numeric(), nullable=True),
        sa.Column("claim_label_en", sa.String(length=256), nullable=False),
        sa.Column(
            "claim_label_te",
            sa.String(length=256),
            nullable=False,
            server_default="",
        ),
        sa.Column(
            "record_observation_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("source_observations.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("record_value", sa.Numeric(), nullable=True),
        sa.Column("record_label_en", sa.String(length=256), nullable=False),
        sa.Column(
            "record_label_te",
            sa.String(length=256),
            nullable=False,
            server_default="",
        ),
        sa.Column("verdict", sa.String(length=24), nullable=False),
        sa.Column("difference", sa.Numeric(), nullable=True),
        sa.Column("difference_percent", sa.Numeric(), nullable=True),
        sa.Column("tolerance_percent", sa.Numeric(), nullable=False),
        sa.Column("method_en", sa.Text(), nullable=False),
        sa.Column("method_te", sa.Text(), nullable=False, server_default=""),
        sa.Column(
            "review_state", sa.String(length=24), nullable=False, server_default="pending"
        ),
        sa.Column("reviewer_identity", sa.String(length=240), nullable=True),
        sa.Column("decided_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "is_published", sa.Boolean(), nullable=False, server_default=sa.text("false")
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.CheckConstraint(
            "verdict IN ('consistent', 'divergent', 'insufficient_data')",
            name="ck_claim_record_comparisons_valid_verdict",
        ),
        sa.CheckConstraint(
            "claim_value IS NOT NULL AND record_value IS NOT NULL "
            "OR verdict = 'insufficient_data'",
            name="ck_claim_record_comparisons_values_for_verdict",
        ),
        sa.CheckConstraint(
            "NOT is_published OR review_state = 'reviewed'",
            name="ck_claim_record_comparisons_reviewed_before_publication",
        ),
        sa.UniqueConstraint(
            "comparison_kind",
            "entity_type",
            "entity_id",
            name="uq_claim_record_comparisons_comparison_identity",
        ),
    )
    op.create_index(
        "ix_claim_record_comparisons_verdict",
        "claim_record_comparisons",
        ["verdict"],
    )
    op.create_index(
        "ix_claim_record_comparisons_claim_observation_id",
        "claim_record_comparisons",
        ["claim_observation_id"],
    )
    op.create_index(
        "ix_claim_record_comparisons_record_observation_id",
        "claim_record_comparisons",
        ["record_observation_id"],
    )


def downgrade() -> None:
    op.drop_table("claim_record_comparisons")