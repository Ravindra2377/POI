from pathlib import Path

from sqlalchemy import CheckConstraint, UniqueConstraint

from app.models.base import Base
from app.models.enums import (
    ObservationReviewState,
    ValueClassification,
)
from app.models.provenance import (
    Correction,
    ReviewDecision,
    SourceObservation,
    SourceSnapshot,
)

MIGRATION = (
    Path(__file__).parents[1] / "alembic" / "versions" / "20260814_0002_provenance_foundation.py"
)


def _constraint_names(table_name: str) -> set[str]:
    names: set[str] = set()
    for constraint in Base.metadata.tables[table_name].constraints:
        if isinstance(constraint, CheckConstraint | UniqueConstraint):
            name = constraint.name
            if name is not None:
                names.add(str(name))
    return names


def test_stage2_provenance_tables_are_registered() -> None:
    assert {
        "sources",
        "source_documents",
        "source_snapshots",
        "extraction_runs",
        "source_observations",
        "review_decisions",
        "observation_corrections",
    }.issubset(Base.metadata.tables)


def test_append_only_models_do_not_offer_updated_timestamps() -> None:
    for model in (SourceSnapshot, SourceObservation, ReviewDecision, Correction):
        assert "created_at" in model.__table__.columns
        assert "updated_at" not in model.__table__.columns


def test_observation_contract_requires_origin_value_and_review_before_publication() -> None:
    names = _constraint_names("source_observations")

    assert "ck_source_observations_provenance_origin" in names
    assert "ck_source_observations_single_value" in names
    assert "ck_source_observations_reviewed_before_publication" in names
    assert ValueClassification.OFFICIAL.value == "official"
    assert ValueClassification.COMMUNITY_REPORTED.value == "community_reported"
    assert ObservationReviewState.SUPERSEDED.value == "superseded"


def test_corrections_are_links_between_distinct_observations() -> None:
    names = _constraint_names("observation_corrections")

    assert "ck_observation_corrections_different_observations" in names
    assert "one_superseding_observation" in names


def test_migration_preserves_stage1_bridge_and_backfills_compatible_chain() -> None:
    text = MIGRATION.read_text(encoding="utf-8")

    assert 'down_revision: str | None = "20260810_0001"' in text
    assert "legacy_source_reference_id" in text
    assert "FROM source_references" in text
    assert text.count("SELECT\n    id,") >= 4
    assert "raw_snapshot_status" in text
    assert "unavailable_legacy_source_reference" in text
    assert "DROP TABLE IF EXISTS source_references" not in text


def test_migration_enforces_append_only_history_and_reviewed_projection() -> None:
    text = MIGRATION.read_text(encoding="utf-8")

    for table in ("source_snapshots", "review_decisions", "observation_corrections"):
        assert f'"{table}",' in text
    assert "validate_review_decision_chain" in text
    assert "trg_review_decisions_validate_chain" in text
    assert "uq_review_decisions_previous" in text
    assert "uq_review_decisions_observation_root" in text
    assert "uq_review_decisions_extraction_root" in text
    assert "new source observations must begin pending and unpublished" in text
    assert "BEFORE INSERT OR UPDATE OR DELETE" in text
    assert "FROM review_decisions AS decision" in text
    upgrade_text, downgrade_text = text.split("def downgrade() -> None:", maxsplit=1)
    drop_chain_trigger = (
        "DROP TRIGGER IF EXISTS trg_review_decisions_validate_chain ON review_decisions"
    )
    assert drop_chain_trigger not in upgrade_text
    assert drop_chain_trigger in downgrade_text
    assert ") = 'approve'" in text
    assert "CREATE TRIGGER trg_{table}_append_only" in text
    assert "CREATE TRIGGER trg_source_observations_guard" in text
    assert "guard_observation_review_transition" in text
    assert "CREATE TRIGGER trg_observation_corrections_validate" in text
    assert "validate_observation_correction" in text
    assert "source observation values are immutable" in text
    assert "latest immutable review decision" in text
    assert "replacement.entity_type = incorrect.entity_type" in text
    assert "replacement.field_path = incorrect.field_path" in text

    assert "BEFORE UPDATE OR DELETE" in text
    assert "CREATE VIEW published_source_observations" in text
    assert "observation.is_published = TRUE" in text
    assert "observation.review_state = 'reviewed'" in text
    assert "NOT EXISTS" in text
    assert "correction.incorrect_observation_id = observation.id" in text
    assert "object_storage_key" not in text.split("PUBLIC_VIEW =", maxsplit=1)[1]
