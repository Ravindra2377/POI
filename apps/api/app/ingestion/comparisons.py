"""Deterministic claims-vs-records comparison engine.

Pairs an official claim observation with a recorded outcome observation and
computes a calculated verdict. Comparisons are platform calculations (Rule 4:
calculated) over reviewed official observations, so every side references a
SourceObservation that itself cites a SourceRecord.
"""

from collections.abc import Sequence
from datetime import UTC, datetime
from decimal import Decimal
from uuid import UUID, uuid5

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.comparison import ClaimRecordComparison
from app.models.enums import (
    ComparisonKind,
    ComparisonVerdict,
    GeographyType,
    ObservationReviewState,
)
from app.models.geography import Geography
from app.models.provenance import SourceObservation

COMPARISON_NAMESPACE = UUID("a9c4f0b2-8d6e-4b1a-9f3c-7e8a0b1c2d3e")

BUDGET_ENTITY_TYPE = "budget_line"
MODERN_BUDGET_COLUMNS = 4
MODERN_BUDGET_MIN_FISCAL_YEAR = "2017-18"

IPM_ENTITY_TYPE = GeographyType.STATE.value
IPM_APPROVED_FIELD = "approved_cost_crores"
IPM_REVISED_FIELD = "revised_cost_crores"
IPM_PROJECT_COUNT_FIELD = "project_count"


def _stable(key: str) -> UUID:
    return uuid5(COMPARISON_NAMESPACE, key)


def _percent(claim: Decimal, record: Decimal) -> Decimal | None:
    if claim == 0:
        return None
    return ((record - claim) / claim * 100).quantize(Decimal("0.01"))


def compute_verdict(
    claim_value: Decimal | None,
    record_value: Decimal | None,
    tolerance_percent: Decimal,
) -> tuple[ComparisonVerdict, Decimal | None, Decimal | None]:
    """Classify claim-vs-record divergence deterministically.

    Returns (verdict, difference, difference_percent). A missing side yields
    INSUFFICIENT_DATA. The claim is authoritative for direction: the verdict
    reports how far the recorded outcome moved from the official claim.
    """
    if claim_value is None or record_value is None:
        return ComparisonVerdict.INSUFFICIENT_DATA, None, None
    difference = record_value - claim_value
    percent = _percent(claim_value, record_value)
    if percent is None:
        # Claim of zero cannot be expressed as a percentage; a recorded
        # non-zero outcome is treated as divergent.
        verdict = (
            ComparisonVerdict.CONSISTENT
            if difference == 0
            else ComparisonVerdict.DIVERGENT
        )
        return verdict, difference, percent
    if abs(percent) <= tolerance_percent:
        return ComparisonVerdict.CONSISTENT, difference, percent
    return ComparisonVerdict.DIVERGENT, difference, percent


def _value_fields(fields: dict[str, object], index: int) -> tuple[Decimal | None, str]:
    value = fields.get(f"value_{index}")
    token = fields.get(f"value_{index}_text")
    rupees = value if isinstance(value, Decimal) else None
    text = str(token) if isinstance(token, str) and token else ""
    return rupees, text


def _observation_lookup(
    observations: Sequence[SourceObservation],
) -> dict[tuple[UUID, str], SourceObservation]:
    """Map (entity_id, field_path) to the reviewed published observation."""
    return {(obs.entity_id, obs.field_path): obs for obs in observations}


def _modern_budget_layout(fields: dict[str, object]) -> bool:
    """True only when the AFS row uses the verified 4-column modern layout.

    In that layout column 1 is the recorded accounts (actuals) column, so a
    claims-vs-records pair is only formed when the column meaning is certain.
    """
    fiscal_year = str(fields.get("fiscal_year", ""))
    if fiscal_year < MODERN_BUDGET_MIN_FISCAL_YEAR:
        return False
    value_count = 0
    while fields.get(f"value_{value_count + 1}") is not None:
        value_count += 1
    return value_count == MODERN_BUDGET_COLUMNS


def _budget_claim_record(
    fields: dict[str, object],
) -> tuple[str, Decimal | None, str, Decimal | None]:
    """Return (claim_label, claim_value, record_label, record_value)."""
    claim_value = fields.get("amount")
    record_value, _ = _value_fields(fields, 1)
    return (
        "Budget estimate",
        claim_value if isinstance(claim_value, Decimal) else None,
        "Accounts (actuals)",
        record_value,
    )


def build_budget_comparisons(
    session: Session,
    *,
    reviewer_identity: str,
    decided_at: datetime,
    tolerance_percent: Decimal = Decimal("5.00"),
) -> dict[str, int]:
    """Build budget-estimate-vs-actuals comparisons from reviewed observations.

    Only modern-layout AFS rows (verified 4-column layout) are paired, so the
    accounts column meaning is never guessed. Rows are idempotently upserted
    keyed by (kind, entity_type, entity_id) and published with the reviewer
    identity recorded on every row.
    """
    observations = session.scalars(
        select(SourceObservation).where(
            SourceObservation.entity_type == BUDGET_ENTITY_TYPE,
            SourceObservation.review_state == ObservationReviewState.REVIEWED,
            SourceObservation.is_published.is_(True),
        )
    ).all()

    grouped: dict[UUID, dict[str, object]] = {}
    for observation in observations:
        value: object = (
            observation.value_number
            if observation.value_number is not None
            else observation.value_text or ""
        )
        grouped.setdefault(observation.entity_id, {})[observation.field_path] = value
    by_key = _observation_lookup(observations)

    created = updated = skipped = 0
    for entity_id in sorted(grouped):
        fields = grouped[entity_id]
        if not _modern_budget_layout(fields):
            skipped += 1
            continue
        claim_label, claim_value, record_label, record_value = _budget_claim_record(fields)
        claim_observation = by_key.get((entity_id, "amount"))
        record_observation = by_key.get((entity_id, "value_1"))
        if (
            claim_value is None
            or record_value is None
            or claim_observation is None
            or record_observation is None
        ):
            skipped += 1
            continue

        verdict, difference, percent = compute_verdict(
            claim_value, record_value, tolerance_percent
        )
        comparison_id = _stable(f"budget:{entity_id}")
        comparison = session.get(ClaimRecordComparison, comparison_id)
        if comparison is None:
            comparison = ClaimRecordComparison(
                id=comparison_id,
                comparison_kind=ComparisonKind.BUDGET_ESTIMATE_VS_ACTUALS.value,
                entity_type=BUDGET_ENTITY_TYPE,
                entity_id=entity_id,
            )
            session.add(comparison)
            created += 1
        else:
            updated += 1

        comparison.entity_label_en = str(fields.get("name_en", "")) or str(entity_id)
        comparison.entity_label_te = str(fields.get("name_te", "")) or ""
        comparison.claim_observation_id = claim_observation.id
        comparison.claim_value = claim_value
        comparison.claim_label_en = claim_label
        comparison.claim_label_te = ""
        comparison.record_observation_id = record_observation.id
        comparison.record_value = record_value
        comparison.record_label_en = record_label
        comparison.record_label_te = ""
        comparison.verdict = verdict.value
        comparison.difference = difference
        comparison.difference_percent = percent
        comparison.tolerance_percent = tolerance_percent
        comparison.method_en = (
            "Budget estimate claimed for the fiscal year compared against the "
            "accounts (actuals) column recorded in the same Annual Financial "
            "Statement row."
        )
        comparison.method_te = ""
        comparison.review_state = ObservationReviewState.REVIEWED.value
        comparison.reviewer_identity = reviewer_identity
        comparison.decided_at = decided_at
        comparison.is_published = True

    session.flush()
    return {"created": created, "updated": updated, "skipped": skipped}


def build_ipm_comparisons(
    session: Session,
    *,
    reviewer_identity: str,
    decided_at: datetime,
    tolerance_percent: Decimal = Decimal("5.00"),
) -> dict[str, int]:
    """Build approved-cost-vs-revised-cost comparisons from MoSPI IPM observations.

    Each State/UT's originally approved (sanctioned) cost is paired with the
    revised cost recorded in the same MoSPI dashboard freeze, so both sides
    come from the same reviewed SourceObservation document. Rows are
    idempotently upserted keyed by (kind, entity_type, entity_id) and published
    with the reviewer identity recorded on every row.
    """
    observations = session.scalars(
        select(SourceObservation).where(
            SourceObservation.entity_type == IPM_ENTITY_TYPE,
            SourceObservation.review_state == ObservationReviewState.REVIEWED,
            SourceObservation.is_published.is_(True),
        )
    ).all()

    grouped: dict[UUID, dict[str, object]] = {}
    for observation in observations:
        if observation.field_path not in {
            IPM_APPROVED_FIELD,
            IPM_REVISED_FIELD,
            IPM_PROJECT_COUNT_FIELD,
        }:
            continue
        value: object = (
            observation.value_number
            if observation.value_number is not None
            else observation.value_text or ""
        )
        grouped.setdefault(observation.entity_id, {})[observation.field_path] = value
    by_key = _observation_lookup(observations)

    geographies = {
        geography.id: geography
        for geography in session.scalars(
            select(Geography).where(Geography.entity_type == GeographyType.STATE)
        ).all()
    }

    created = updated = skipped = 0
    for entity_id in sorted(grouped):
        fields = grouped[entity_id]
        claim_value = fields.get(IPM_APPROVED_FIELD)
        record_value = fields.get(IPM_REVISED_FIELD)
        claim_observation = by_key.get((entity_id, IPM_APPROVED_FIELD))
        record_observation = by_key.get((entity_id, IPM_REVISED_FIELD))
        if (
            not isinstance(claim_value, Decimal)
            or not isinstance(record_value, Decimal)
            or claim_observation is None
            or record_observation is None
        ):
            skipped += 1
            continue

        verdict, difference, percent = compute_verdict(
            claim_value, record_value, tolerance_percent
        )
        comparison_id = _stable(f"ipm:{entity_id}")
        comparison = session.get(ClaimRecordComparison, comparison_id)
        if comparison is None:
            comparison = ClaimRecordComparison(
                id=comparison_id,
                comparison_kind=ComparisonKind.PROJECT_COST_VS_REVISED_COST.value,
                entity_type=IPM_ENTITY_TYPE,
                entity_id=entity_id,
            )
            session.add(comparison)
            created += 1
        else:
            updated += 1

        geography = geographies.get(entity_id)
        comparison.entity_label_en = (
            geography.name_en if geography is not None else str(entity_id)
        )
        comparison.entity_label_te = geography.name_te or "" if geography is not None else ""
        comparison.claim_observation_id = claim_observation.id
        comparison.claim_value = claim_value
        comparison.claim_label_en = "Approved cost"
        comparison.claim_label_te = "ఆమోదించిన వ్యయం"
        comparison.record_observation_id = record_observation.id
        comparison.record_value = record_value
        comparison.record_label_en = "Revised cost"
        comparison.record_label_te = "సవరించిన వ్యయం"
        comparison.verdict = verdict.value
        comparison.difference = difference
        comparison.difference_percent = percent
        comparison.tolerance_percent = tolerance_percent
        comparison.method_en = (
            "The originally approved (sanctioned) cost of centrally monitored "
            "infrastructure projects in the State/UT compared against the revised "
            "cost recorded in the same MoSPI IPM dashboard freeze, in INR crore."
        )
        comparison.method_te = (
            "కేంద్ర పర్యవేక్షణ మౌలిక సదుపాయాల ప్రాజెక్టులకు ఆమోదించిన వ్యయాన్ని, "
            "అదే MoSPI IPM డాష్బోర్డు ఫ్రీజ్లో నమోదైన సవరించిన వ్యయంతో పోల్చారు "
            "(కోట్ల రూపాయలలో)."
        )
        comparison.review_state = ObservationReviewState.REVIEWED.value
        comparison.reviewer_identity = reviewer_identity
        comparison.decided_at = decided_at
        comparison.is_published = True

    session.flush()
    return {"created": created, "updated": updated, "skipped": skipped}


def list_published_comparisons(session: Session) -> Sequence[ClaimRecordComparison]:
    return session.scalars(
        select(ClaimRecordComparison)
        .where(
            ClaimRecordComparison.is_published.is_(True),
            ClaimRecordComparison.review_state == ObservationReviewState.REVIEWED.value,
        )
        .order_by(ClaimRecordComparison.created_at.desc())
    ).all()


def now_utc() -> datetime:
    return datetime.now(UTC)