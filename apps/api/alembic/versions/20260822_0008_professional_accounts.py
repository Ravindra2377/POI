"""Add isolated professional customer accounts and audited access state.

Revision ID: 20260822_0008
Revises: 20260820_0007
Create Date: 2026-08-22
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "20260822_0008"
down_revision: str | None = "20260820_0007"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "professional_accounts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("display_name", sa.String(length=128), nullable=False),
        sa.Column("organization_name", sa.String(length=200), nullable=False),
        sa.Column("password_hash", sa.Text(), nullable=False),
        sa.Column("requested_plan", sa.String(length=24), nullable=False),
        sa.Column("access_plan", sa.String(length=24), nullable=False, server_default="none"),
        sa.Column(
            "billing_status",
            sa.String(length=24),
            nullable=False,
            server_default="not_started",
        ),
        sa.Column(
            "status",
            sa.String(length=32),
            nullable=False,
            server_default="pending_verification",
        ),
        sa.Column("email_verified_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("terms_accepted_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("failed_login_attempts", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("locked_until", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.CheckConstraint(
            "requested_plan IN ('professional', 'organization')",
            name="ck_professional_accounts_requested_plan",
        ),
        sa.CheckConstraint(
            "access_plan IN ('none', 'professional', 'organization')",
            name="ck_professional_accounts_access_plan",
        ),
        sa.CheckConstraint(
            (
                "billing_status IN ('not_started', 'payment_pending', 'paid', "
                "'past_due', 'cancelled', 'complimentary')"
            ),
            name="ck_professional_accounts_billing_status",
        ),
        sa.CheckConstraint(
            (
                "status IN ('pending_verification', 'pending_review', "
                "'active', 'suspended', 'rejected')"
            ),
            name="ck_professional_accounts_status",
        ),
    )
    op.create_index(
        "ix_professional_accounts_email", "professional_accounts", ["email"], unique=True
    )
    op.create_index(
        "ix_professional_accounts_requested_plan", "professional_accounts", ["requested_plan"]
    )
    op.create_index(
        "ix_professional_accounts_access_plan", "professional_accounts", ["access_plan"]
    )
    op.create_index(
        "ix_professional_accounts_billing_status", "professional_accounts", ["billing_status"]
    )
    op.create_index("ix_professional_accounts_status", "professional_accounts", ["status"])

    op.create_table(
        "professional_sessions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "professional_account_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("professional_accounts.id", ondelete="CASCADE"),
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
    op.create_index(
        "ix_professional_sessions_professional_account_id",
        "professional_sessions",
        ["professional_account_id"],
    )
    op.create_index(
        "ix_professional_sessions_token_hash", "professional_sessions", ["token_hash"], unique=True
    )
    op.create_index("ix_professional_sessions_expires_at", "professional_sessions", ["expires_at"])

    op.create_table(
        "professional_email_verifications",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "professional_account_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("professional_accounts.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("consumed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
    )
    op.create_index(
        "ix_professional_email_verifications_professional_account_id",
        "professional_email_verifications",
        ["professional_account_id"],
    )
    op.create_index(
        "ix_professional_email_verifications_token_hash",
        "professional_email_verifications",
        ["token_hash"],
        unique=True,
    )
    op.create_index(
        "ix_professional_email_verifications_expires_at",
        "professional_email_verifications",
        ["expires_at"],
    )

    op.create_table(
        "professional_account_audit_records",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "professional_account_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("professional_accounts.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "staff_account_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("staff_accounts.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("action", sa.String(length=48), nullable=False),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column("previous_state", postgresql.JSONB(), nullable=True),
        sa.Column("new_state", postgresql.JSONB(), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
    )
    op.create_index(
        "ix_professional_account_audit_records_professional_account_id",
        "professional_account_audit_records",
        ["professional_account_id"],
    )
    op.create_index(
        "ix_professional_account_audit_records_staff_account_id",
        "professional_account_audit_records",
        ["staff_account_id"],
    )
    op.create_index(
        "ix_professional_account_audit_records_action",
        "professional_account_audit_records",
        ["action"],
    )
    op.create_index(
        "ix_professional_account_audit_records_created_at",
        "professional_account_audit_records",
        ["created_at"],
    )


def downgrade() -> None:
    op.drop_table("professional_account_audit_records")
    op.drop_table("professional_email_verifications")
    op.drop_table("professional_sessions")
    op.drop_table("professional_accounts")
