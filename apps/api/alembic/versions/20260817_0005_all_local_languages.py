"""Widen language_code constraints to all Indian official languages.

Revision ID: 20260817_0005
Revises: 20260817_0004
Create Date: 2026-08-17
"""

from collections.abc import Sequence

from alembic import op

revision: str = "20260817_0005"
down_revision: str | None = "20260817_0004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# All 22 Eighth Schedule official languages of India plus English and Mizo.
LANGUAGE_CODES = (
    "en",
    "te",
    "und",
    "as",
    "bn",
    "brx",
    "doi",
    "gu",
    "hi",
    "kn",
    "ks",
    "kok",
    "mai",
    "ml",
    "mni",
    "mr",
    "mzo",
    "ne",
    "or",
    "pa",
    "sa",
    "sat",
    "sd",
    "ta",
    "ur",
)

_LANGUAGE_IN = "(" + ", ".join(f"'{code}'" for code in LANGUAGE_CODES) + ")"

# Tables with an inline CHECK on language_code created before national coverage.
_LANGUAGE_CHECK_TABLES = (
    "geography_aliases",
    "government_body_aliases",
    "public_office_aliases",
    "source_documents",
)


def upgrade() -> None:
    # Migration 20260810_0001 created these CHECK constraints inline in raw SQL,
    # so PostgreSQL auto-named them `<table>_language_code_check`. The alembic
    # naming convention would re-prefix a name passed to op.drop_constraint, so
    # drop them by their exact on-disk names.
    for table in _LANGUAGE_CHECK_TABLES:
        op.execute(
            f"ALTER TABLE {table} DROP CONSTRAINT {table}_language_code_check"
        )
        op.execute(
            f"ALTER TABLE {table} ADD CONSTRAINT {table}_language_code_check "
            f"CHECK (language_code IN {_LANGUAGE_IN})"
        )


def downgrade() -> None:
    for table in _LANGUAGE_CHECK_TABLES:
        op.execute(
            f"ALTER TABLE {table} DROP CONSTRAINT {table}_language_code_check"
        )
        op.execute(
            f"ALTER TABLE {table} ADD CONSTRAINT {table}_language_code_check "
            "CHECK (language_code IN ('en', 'te', 'und'))"
        )
