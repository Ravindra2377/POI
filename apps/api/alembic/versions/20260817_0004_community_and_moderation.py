"""Add community accounts, reports, polls, votes, comments, and moderation audit tables.

Revision ID: 20260817_0004
Revises: 20260816_0003
Create Date: 2026-08-17
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "20260817_0004"
down_revision: str | None = "20260816_0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # 1. user_accounts
    op.create_table(
        "user_accounts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("username", sa.String(length=64), nullable=False, unique=True),
        sa.Column("display_name", sa.String(length=128), nullable=False),
        sa.Column(
            "district_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("geographies.id"),
            nullable=True,
        ),
        sa.Column(
            "consent_data_sharing",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
        ),
        sa.Column(
            "consent_public_activity",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
        ),
        sa.Column("preferred_language", sa.String(length=10), nullable=False, server_default="en"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index("ix_user_accounts_username", "user_accounts", ["username"], unique=True)
    op.create_index("ix_user_accounts_district_id", "user_accounts", ["district_id"])

    # 2. community_reports
    op.create_table(
        "community_reports",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("user_accounts.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("entity_type", sa.String(length=64), nullable=False),
        sa.Column("entity_id", sa.String(length=256), nullable=True),
        sa.Column(
            "district_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("geographies.id"),
            nullable=True,
        ),
        sa.Column("title_en", sa.String(length=256), nullable=False),
        sa.Column("title_te", sa.String(length=256), nullable=True),
        sa.Column("description_en", sa.Text(), nullable=False),
        sa.Column("description_te", sa.Text(), nullable=True),
        sa.Column(
            "classification",
            sa.String(length=32),
            nullable=False,
            server_default="community_reported",
        ),
        sa.Column(
            "evidence_urls",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
        sa.Column(
            "status", sa.String(length=32), nullable=False, server_default="published"
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index("ix_community_reports_user_id", "community_reports", ["user_id"])
    op.create_index("ix_community_reports_entity_type", "community_reports", ["entity_type"])
    op.create_index("ix_community_reports_entity_id", "community_reports", ["entity_id"])
    op.create_index("ix_community_reports_district_id", "community_reports", ["district_id"])
    op.create_index("ix_community_reports_status", "community_reports", ["status"])
    op.create_index("ix_community_reports_created_at", "community_reports", ["created_at"])

    # 3. community_polls
    op.create_table(
        "community_polls",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("title_en", sa.String(length=256), nullable=False),
        sa.Column("title_te", sa.String(length=256), nullable=True),
        sa.Column("description_en", sa.Text(), nullable=False),
        sa.Column("description_te", sa.Text(), nullable=True),
        sa.Column("entity_type", sa.String(length=64), nullable=True),
        sa.Column("entity_id", sa.String(length=256), nullable=True),
        sa.Column("options", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index("ix_community_polls_is_active", "community_polls", ["is_active"])

    # 4. poll_votes
    op.create_table(
        "poll_votes",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "poll_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("community_polls.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("user_accounts.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("option_id", sa.String(length=64), nullable=False),
        sa.Column(
            "district_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("geographies.id"),
            nullable=True,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index("ix_poll_votes_poll_id", "poll_votes", ["poll_id"])
    op.create_index("ix_poll_votes_user_id", "poll_votes", ["user_id"])
    op.create_index(
        "ix_poll_votes_poll_user_unique", "poll_votes", ["poll_id", "user_id"], unique=True
    )

    # 5. community_comments
    op.create_table(
        "community_comments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("user_accounts.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("target_type", sa.String(length=64), nullable=False),
        sa.Column("target_id", sa.String(length=256), nullable=False),
        sa.Column("rating", sa.Integer(), nullable=True),
        sa.Column("content_en", sa.Text(), nullable=False),
        sa.Column("content_te", sa.Text(), nullable=True),
        sa.Column(
            "status", sa.String(length=32), nullable=False, server_default="published"
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index("ix_community_comments_user_id", "community_comments", ["user_id"])
    op.create_index(
        "ix_community_comments_target_type", "community_comments", ["target_type"]
    )
    op.create_index("ix_community_comments_target_id", "community_comments", ["target_id"])

    # 6. moderation_audit_records
    op.create_table(
        "moderation_audit_records",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("moderator_id", sa.String(length=128), nullable=False),
        sa.Column("action", sa.String(length=32), nullable=False),
        sa.Column("target_type", sa.String(length=64), nullable=False),
        sa.Column("target_id", sa.String(length=256), nullable=False),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column("previous_state", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("new_state", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index(
        "ix_moderation_audit_records_moderator_id",
        "moderation_audit_records",
        ["moderator_id"],
    )
    op.create_index("ix_moderation_audit_records_action", "moderation_audit_records", ["action"])
    op.create_index(
        "ix_moderation_audit_records_target_type",
        "moderation_audit_records",
        ["target_type"],
    )
    op.create_index(
        "ix_moderation_audit_records_target_id",
        "moderation_audit_records",
        ["target_id"],
    )


def downgrade() -> None:
    op.drop_table("moderation_audit_records")
    op.drop_table("community_comments")
    op.drop_table("poll_votes")
    op.drop_table("community_polls")
    op.drop_table("community_reports")
    op.drop_table("user_accounts")
