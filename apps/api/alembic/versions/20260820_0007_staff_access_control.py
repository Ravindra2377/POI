"""Add authenticated admin and moderator accounts.

Revision ID: 20260820_0007
Revises: 20260817_0006
Create Date: 2026-08-20
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "20260820_0007"
down_revision: str | None = "20260817_0006"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "staff_accounts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("display_name", sa.String(length=128), nullable=False),
        sa.Column("role", sa.String(length=24), nullable=False),
        sa.Column("password_hash", sa.Text(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column(
            "must_change_password", sa.Boolean(), nullable=False, server_default=sa.text("false")
        ),
        sa.Column(
            "created_by_staff_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("staff_accounts.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "failed_login_attempts", sa.Integer(), nullable=False, server_default=sa.text("0")
        ),
        sa.Column("locked_until", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.CheckConstraint("role IN ('admin', 'moderator')", name="ck_staff_accounts_role"),
    )
    op.create_index("ix_staff_accounts_email", "staff_accounts", ["email"], unique=True)
    op.create_index("ix_staff_accounts_role", "staff_accounts", ["role"])
    op.create_index("ix_staff_accounts_is_active", "staff_accounts", ["is_active"])

    op.create_table(
        "staff_sessions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "staff_account_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("staff_accounts.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "last_used_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
    )
    op.create_index("ix_staff_sessions_staff_account_id", "staff_sessions", ["staff_account_id"])
    op.create_index("ix_staff_sessions_token_hash", "staff_sessions", ["token_hash"], unique=True)
    op.create_index("ix_staff_sessions_expires_at", "staff_sessions", ["expires_at"])

    op.add_column(
        "moderation_audit_records",
        sa.Column("staff_account_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_foreign_key(
        "fk_moderation_audit_records_staff_account_id",
        "moderation_audit_records",
        "staff_accounts",
        ["staff_account_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index(
        "ix_moderation_audit_records_staff_account_id",
        "moderation_audit_records",
        ["staff_account_id"],
    )
    op.alter_column("community_reports", "status", server_default="pending_review")
    op.alter_column("community_comments", "status", server_default="pending_review")


def downgrade() -> None:
    op.alter_column("community_comments", "status", server_default="published")
    op.alter_column("community_reports", "status", server_default="published")
    op.drop_index(
        "ix_moderation_audit_records_staff_account_id", table_name="moderation_audit_records"
    )
    op.drop_constraint(
        "fk_moderation_audit_records_staff_account_id",
        "moderation_audit_records",
        type_="foreignkey",
    )
    op.drop_column("moderation_audit_records", "staff_account_id")
    op.drop_table("staff_sessions")
    op.drop_table("staff_accounts")
