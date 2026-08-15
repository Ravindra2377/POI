from datetime import date
from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import HttpUrl

from app.models.enums import ReviewStatus
from app.schemas.common import APIModel
from app.schemas.schemes import LocalizedTextOut


class BudgetSourceOut(APIModel):
    """Provenance for one official budget figure."""

    source_record_id: UUID
    source_name: str
    official_source_url: HttpUrl
    public_source_url: HttpUrl | None = None
    retrieval_date: date
    review_status: ReviewStatus


class BudgetClaimOut(APIModel):
    """An official single-value budget claim with its source."""

    classification: Literal["official"]
    value: LocalizedTextOut
    source: BudgetSourceOut


class BudgetAmountOut(APIModel):
    """One value column of an Annual Financial Statement major head.

    ``value_text`` is the raw token transcribed from the official PDF, and
    ``rupees`` is that token decoded to whole rupees using the statement's
    declared unit (Thousands/Lakhs/Crores). ``label`` names the column only
    when the source layout makes the column unambiguous; otherwise it falls
    back to a positional label.
    """

    label: str
    value_text: str
    rupees: Decimal


class BudgetLineOut(APIModel):
    """One reviewed Andhra Pradesh budget major head with per-claim provenance."""

    slug: str
    fiscal_year: str
    statement: str
    code: str
    name: BudgetClaimOut
    unit: str
    amounts: list[BudgetAmountOut]
    budget_estimate: BudgetClaimOut
    source: BudgetSourceOut


class BudgetCatalogOut(APIModel):
    data: list[BudgetLineOut]
    status: Literal["prepared-empty", "reviewed"]