import hashlib
import os
from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime, timedelta
from pathlib import Path
from threading import Barrier
from uuid import UUID, uuid4

import pytest
from sqlalchemy import create_engine, func, inspect, select, text
from sqlalchemy.engine import Connection, Engine
from sqlalchemy.exc import DBAPIError, IntegrityError
from sqlalchemy.orm import Session

from alembic import command
from alembic.config import Config
from app.db import normalize_database_url
from app.models.enums import GeographyType, GovernmentBodyType
from app.models.geography import Geography
from app.models.government import GovernmentBody
from app.models.provenance import (
    ReviewDecision,
    SourceDocument,
    SourceObservation,
    SourceRecord,
)
from app.models.source import SourceReference
from app.repositories import SQLCatalogRepository
from app.seeds import seed_stage1

TEST_DATABASE_URL = os.getenv("TEST_DATABASE_URL")
pytestmark = pytest.mark.skipif(
    not TEST_DATABASE_URL,
    reason="TEST_DATABASE_URL is required for PostgreSQL/PostGIS integration tests",
)


def _alembic_config() -> Config:
    config = Config(str(Path(__file__).parents[2] / "alembic.ini"))
    assert TEST_DATABASE_URL is not None
    config.set_main_option("sqlalchemy.url", normalize_database_url(TEST_DATABASE_URL))
    return config

def _create_candidate(
    connection: Connection,
    *,
    document_id: UUID,
    entity_id: UUID,
    field_path: str,
    suffix: str,
) -> tuple[UUID, UUID]:
    snapshot_id = uuid4()
    extraction_run_id = uuid4()
    observation_id = uuid4()
    now = datetime.now(UTC)
    checksum = hashlib.sha256(suffix.encode()).hexdigest()
    connection.execute(
        text(
            """
            INSERT INTO source_snapshots (
                id, document_id, retrieved_at, http_status, content_type,
                file_size_bytes, sha256, object_storage_key, retrieval_metadata
            ) VALUES (
                :id, :document_id, :retrieved_at, 200, 'text/csv',
                :file_size, :sha256, :object_key, '{}'::jsonb
            )
            """
        ),
        {
            "id": snapshot_id,
            "document_id": document_id,
            "retrieved_at": now,
            "file_size": len(suffix),
            "sha256": checksum,
            "object_key": f"test/{snapshot_id}",
        },
    )
    connection.execute(
        text(
            """
            INSERT INTO extraction_runs (
                id, snapshot_id, adapter_name, adapter_version, started_at,
                completed_at, status, extracted_record_count,
                parser_configuration, software_revision
            ) VALUES (
                :id, :snapshot_id, 'integration-test', '1', :started_at,
                :completed_at, 'succeeded', 1, '{}'::jsonb, 'test'
            )
            """
        ),
        {
            "id": extraction_run_id,
            "snapshot_id": snapshot_id,
            "started_at": now,
            "completed_at": now,
        },
    )
    connection.execute(
        text(
            """
            INSERT INTO source_observations (
                id, entity_type, entity_id, field_path, value_text, document_id,
                snapshot_id, extraction_run_id, classification, review_state,
                is_published
            ) VALUES (
                :id, 'integration_test', :entity_id, :field_path, :value,
                :document_id, :snapshot_id, :extraction_run_id, 'official',
                'pending', FALSE
            )
            """
        ),
        {
            "id": observation_id,
            "entity_id": entity_id,
            "field_path": field_path,
            "value": suffix,
            "document_id": document_id,
            "snapshot_id": snapshot_id,
            "extraction_run_id": extraction_run_id,
        },
    )
    return observation_id, snapshot_id


def _approve_observation(
    connection: Connection,
    observation_id: UUID,
    *,
    decided_at: datetime | None = None,
    previous_decision_id: UUID | None = None,
) -> UUID:
    decision_id = uuid4()
    connection.execute(
        text(
            """
            INSERT INTO review_decisions (
                id, observation_id, reviewer_identity, decision, reason,
                decided_at, previous_decision_id
            ) VALUES (
                :id, :observation_id, 'integration-reviewer', 'approve',
                'integration approval', :decided_at, :previous_decision_id
            )
            """
        ),
        {
            "id": decision_id,
            "observation_id": observation_id,
            "decided_at": decided_at or datetime.now(UTC),
            "previous_decision_id": previous_decision_id,
        },
    )
    connection.execute(
        text(
            """
            UPDATE source_observations
            SET review_state = 'reviewed', is_published = TRUE
            WHERE id = :observation_id
            """
        ),
        {"observation_id": observation_id},
    )
    return decision_id


def _insert_correction(
    connection: Connection,
    *,
    incorrect_id: UUID,
    replacement_id: UUID,
    decision_id: UUID,
) -> None:
    connection.execute(
        text(
            """
            INSERT INTO observation_corrections (
                id, incorrect_observation_id, superseding_observation_id,
                reason, review_decision_id, corrected_at
            ) VALUES (
                :id, :incorrect_id, :replacement_id,
                'integration correction', :decision_id, :corrected_at
            )
            """
        ),
        {
            "id": uuid4(),
            "incorrect_id": incorrect_id,
            "replacement_id": replacement_id,
            "decision_id": decision_id,
            "corrected_at": datetime.now(UTC),
        },
    )



def test_stage1_seed_upgrade_backfill_and_reupgrade_are_idempotent() -> None:
    assert TEST_DATABASE_URL is not None
    assert "_test" in TEST_DATABASE_URL, "integration tests require a dedicated test database"

    config = _alembic_config()
    command.downgrade(config, "base")
    command.upgrade(config, "20260810_0001")

    engine = create_engine(normalize_database_url(TEST_DATABASE_URL))
    with Session(engine) as session:
        with session.begin():
            stage1_seed = seed_stage1(session)

        stage1_geography_ids = set(session.scalars(select(Geography.id)))
        stage1_government_ids = set(session.scalars(select(GovernmentBody.id)))
        stage1_source_ids = set(session.scalars(select(SourceReference.id)))

        assert stage1_seed.geographies_created == 27
        assert stage1_seed.sources_created == 28
        assert len(stage1_geography_ids) == 27
        assert len(stage1_government_ids) == 4
        assert len(stage1_source_ids) == 28
        assert not inspect(engine).has_table("sources")

    command.upgrade(config, "head")

    with Session(engine) as session:
        with session.begin():
            first_rerun = seed_stage1(session)
        with session.begin():
            second_rerun = seed_stage1(session)

        assert first_rerun.geographies_created == 0
        assert first_rerun.sources_created == 0
        assert second_rerun.geographies_created == 0
        assert second_rerun.sources_created == 0
        assert session.scalar(select(func.count()).select_from(Geography)) == 27
        assert session.scalar(select(func.count()).select_from(GovernmentBody)) == 4
        assert session.scalar(select(func.count()).select_from(SourceReference)) == 28
        assert session.scalar(select(func.count()).select_from(SourceRecord)) == 28
        assert session.scalar(select(func.count()).select_from(SourceDocument)) == 28
        assert session.scalar(select(func.count()).select_from(SourceObservation)) == 28
        assert session.scalar(select(func.count()).select_from(ReviewDecision)) == 28
        assert all(item.source_id for item in session.scalars(select(Geography)))

        assert set(session.scalars(select(Geography.id))) == stage1_geography_ids
        assert set(session.scalars(select(GovernmentBody.id))) == stage1_government_ids
        assert set(session.scalars(select(SourceRecord.id))) == stage1_source_ids
        assert set(session.scalars(select(SourceDocument.id))) == stage1_source_ids
        assert set(session.scalars(select(SourceObservation.id))) == stage1_source_ids
        assert set(session.scalars(select(ReviewDecision.id))) == stage1_source_ids
        assert session.scalar(
            text(
                "SELECT count(*) FROM source_documents "
                "WHERE metadata->>'raw_snapshot_status' = "
                "'unavailable_legacy_source_reference'"
            )
        ) == 28
        assert session.scalar(text("SELECT count(*) FROM published_source_observations")) == 28
        assert session.scalar(
            text(
                "SELECT count(*) FROM pg_trigger "
                "WHERE tgname = 'trg_review_decisions_validate_chain' "
                "AND NOT tgisinternal"
            )
        ) == 1

        catalog = SQLCatalogRepository(session)
        districts = catalog.list_geographies(
            entity_type=GeographyType.DISTRICT,
            parent=None,
            active_on=None,
            query=None,
            page=1,
            page_size=100,
        )
        alias_results = catalog.list_geographies(
            entity_type=None,
            parent=None,
            active_on=None,
            query="Vizag",
            page=1,
            page_size=100,
        )
        telugu_results = catalog.list_geographies(
            entity_type=None,
            parent=None,
            active_on=None,
            query="విశాఖపట్నం",
            page=1,
            page_size=100,
        )
        departments = catalog.list_government_bodies(
            body_type=GovernmentBodyType.DEPARTMENT,
            parent=None,
            active_on=None,
            query=None,
            page=1,
            page_size=100,
        )

        assert districts.meta.total == 26
        database_version = session.scalar(text("SHOW server_version"))
        postgis_version = session.scalar(
            text("SELECT extversion FROM pg_extension WHERE extname = 'postgis'")
        )
        assert str(database_version).startswith("16.")
        assert str(postgis_version).startswith("3.5")

        assert [item.slug for item in alias_results.data] == ["visakhapatnam"]
        assert [item.slug for item in telugu_results.data] == ["visakhapatnam"]
        assert departments.meta.total == 3

    with pytest.raises(DBAPIError), engine.begin() as connection:
        connection.execute(text("UPDATE source_observations SET field_path = 'tampered'"))

    command.downgrade(config, "20260810_0001")
    assert not inspect(engine).has_table("sources")
    with Session(engine) as session:
        assert set(session.scalars(select(Geography.id))) == stage1_geography_ids
        assert set(session.scalars(select(GovernmentBody.id))) == stage1_government_ids
        assert set(session.scalars(select(SourceReference.id))) == stage1_source_ids

    command.upgrade(config, "head")
    with Session(engine) as session:
        assert set(session.scalars(select(SourceRecord.id))) == stage1_source_ids
        assert set(session.scalars(select(SourceDocument.id))) == stage1_source_ids
        assert set(session.scalars(select(SourceObservation.id))) == stage1_source_ids
        assert set(session.scalars(select(ReviewDecision.id))) == stage1_source_ids
        assert session.scalar(text("SELECT count(*) FROM published_source_observations")) == 28



def _reset_stage2_database() -> Engine:
    assert TEST_DATABASE_URL is not None
    assert "_test" in TEST_DATABASE_URL
    config = _alembic_config()
    command.downgrade(config, "base")
    command.upgrade(config, "20260810_0001")
    engine = create_engine(normalize_database_url(TEST_DATABASE_URL))
    with Session(engine) as session, session.begin():
        seed_stage1(session)
    command.upgrade(config, "head")
    return engine


def test_concurrent_reviews_require_the_current_audit_head() -> None:
    engine = _reset_stage2_database()
    with engine.begin() as connection:
        document_id = connection.scalar(text("SELECT id FROM source_documents ORDER BY id LIMIT 1"))
        assert isinstance(document_id, UUID)
        observation_id, _ = _create_candidate(
            connection,
            document_id=document_id,
            entity_id=uuid4(),
            field_path="concurrency.review",
            suffix=f"review-{uuid4()}",
        )

    barrier = Barrier(2)

    def insert_competing_decision(decision: str) -> str:
        try:
            with engine.begin() as connection:
                barrier.wait()
                connection.execute(
                    text(
                        """
                        INSERT INTO review_decisions (
                            id, observation_id, reviewer_identity, decision,
                            reason, decided_at
                        ) VALUES (
                            :id, :observation_id, :reviewer, :decision,
                            'concurrent integration decision', :decided_at
                        )
                        """
                    ),
                    {
                        "id": uuid4(),
                        "observation_id": observation_id,
                        "reviewer": f"integration:{decision}",
                        "decision": decision,
                        "decided_at": datetime.now(UTC),
                    },
                )
            return "created"
        except DBAPIError:
            return "rejected"

    with ThreadPoolExecutor(max_workers=2) as executor:
        outcomes = list(
            executor.map(insert_competing_decision, ("approve", "reject"))
        )

    assert sorted(outcomes) == ["created", "rejected"]
    with engine.begin() as connection:
        decision_row = connection.execute(
            text(
                """
                SELECT id, decision
                FROM review_decisions
                WHERE observation_id = :observation_id
                """
            ),
            {"observation_id": observation_id},
        ).one()
        assert connection.scalar(
            text(
                "SELECT count(*) FROM review_decisions "
                "WHERE observation_id = :observation_id"
            ),
            {"observation_id": observation_id},
        ) == 1

    with pytest.raises(DBAPIError), engine.begin() as connection:
        connection.execute(
            text(
                """
                INSERT INTO review_decisions (
                    id, observation_id, reviewer_identity, decision,
                    reason, decided_at
                ) VALUES (
                    :id, :observation_id, 'integration:stale', 'request_changes',
                    'stale audit head', :decided_at
                )
                """
            ),
            {
                "id": uuid4(),
                "observation_id": observation_id,
                "decided_at": datetime.now(UTC) + timedelta(seconds=1),
            },
        )


    with pytest.raises(DBAPIError), engine.begin() as connection:
        connection.execute(
            text(
                """
                INSERT INTO review_decisions (
                    id, observation_id, reviewer_identity, decision,
                    reason, decided_at, previous_decision_id
                ) VALUES (
                    :id, :observation_id, 'integration:backdated', 'request_changes',
                    'backdated audit head', :decided_at, :previous_id
                )
                """
            ),
            {
                "id": uuid4(),
                "observation_id": observation_id,
                "decided_at": datetime(2000, 1, 1, tzinfo=UTC),
                "previous_id": decision_row.id,
            },
        )

    with engine.begin() as connection:
        connection.execute(
            text(
                """
                INSERT INTO review_decisions (
                    id, observation_id, reviewer_identity, decision,
                    reason, decided_at, previous_decision_id
                ) VALUES (
                    :id, :observation_id, 'integration:retry', 'request_changes',
                    'retry from current audit head', :decided_at, :previous_id
                )
                """
            ),
            {
                "id": uuid4(),
                "observation_id": observation_id,
                "decided_at": datetime.now(UTC) + timedelta(seconds=2),
                "previous_id": decision_row.id,
            },
        )
        connection.execute(
            text(
                """
                UPDATE source_observations
                SET review_state = 'pending', is_published = FALSE
                WHERE id = :observation_id
                """
            ),
            {"observation_id": observation_id},
        )
    engine.dispose()


def test_concurrent_snapshot_and_correction_duplicates_are_rejected() -> None:
    engine = _reset_stage2_database()
    with engine.connect() as connection:
        document_ids = list(
            connection.scalars(text("SELECT id FROM source_documents ORDER BY id LIMIT 3"))
        )
    assert len(document_ids) == 3

    duplicate_checksum = hashlib.sha256(b"same-source-bytes").hexdigest()
    snapshot_barrier = Barrier(2)

    def insert_duplicate_snapshot(_: int) -> str:
        try:
            with engine.begin() as connection:
                snapshot_barrier.wait()
                connection.execute(
                    text(
                        """
                        INSERT INTO source_snapshots (
                            id, document_id, retrieved_at, http_status, content_type,
                            file_size_bytes, sha256, object_storage_key,
                            retrieval_metadata
                        ) VALUES (
                            :id, :document_id, :retrieved_at, 200, 'text/csv',
                            17, :sha256, :object_key, '{}'::jsonb
                        )
                        """
                    ),
                    {
                        "id": uuid4(),
                        "document_id": document_ids[0],
                        "retrieved_at": datetime.now(UTC),
                        "sha256": duplicate_checksum,
                        "object_key": f"test/duplicate/{uuid4()}",
                    },
                )
            return "created"
        except IntegrityError:
            return "duplicate"

    with ThreadPoolExecutor(max_workers=2) as executor:
        snapshot_outcomes = list(executor.map(insert_duplicate_snapshot, (1, 2)))
    assert sorted(snapshot_outcomes) == ["created", "duplicate"]

    entity_id = uuid4()
    with engine.begin() as connection:
        original_id, _ = _create_candidate(
            connection,
            document_id=document_ids[0],
            entity_id=entity_id,
            field_path="correction.race",
            suffix=f"original-{uuid4()}",
        )
        replacement_one_id, _ = _create_candidate(
            connection,
            document_id=document_ids[1],
            entity_id=entity_id,
            field_path="correction.race",
            suffix=f"replacement-one-{uuid4()}",
        )
        replacement_two_id, _ = _create_candidate(
            connection,
            document_id=document_ids[2],
            entity_id=entity_id,
            field_path="correction.race",
            suffix=f"replacement-two-{uuid4()}",
        )
        _approve_observation(connection, original_id)
        decision_one = _approve_observation(connection, replacement_one_id)
        decision_two = _approve_observation(connection, replacement_two_id)

    correction_barrier = Barrier(2)

    def insert_competing_correction(args: tuple[UUID, UUID]) -> str:
        replacement_id, decision_id = args
        try:
            with engine.begin() as connection:
                correction_barrier.wait()
                _insert_correction(
                    connection,
                    incorrect_id=original_id,
                    replacement_id=replacement_id,
                    decision_id=decision_id,
                )
            return "created"
        except IntegrityError:
            return "duplicate"

    with ThreadPoolExecutor(max_workers=2) as executor:
        correction_outcomes = list(
            executor.map(
                insert_competing_correction,
                (
                    (replacement_one_id, decision_one),
                    (replacement_two_id, decision_two),
                ),
            )
        )
    assert sorted(correction_outcomes) == ["created", "duplicate"]
    with engine.connect() as connection:
        assert connection.scalar(
            text(
                "SELECT count(*) FROM observation_corrections "
                "WHERE incorrect_observation_id = :original_id"
            ),
            {"original_id": original_id},
        ) == 1
    engine.dispose()


def test_publication_correction_chains_and_append_only_guards() -> None:
    engine = _reset_stage2_database()
    with engine.connect() as connection:
        document_ids = list(
            connection.scalars(text("SELECT id FROM source_documents ORDER BY id LIMIT 5"))
        )
    assert len(document_ids) == 5

    entity_id = uuid4()
    with engine.begin() as connection:
        original_id, snapshot_id = _create_candidate(
            connection,
            document_id=document_ids[0],
            entity_id=entity_id,
            field_path="correction.chain",
            suffix=f"chain-original-{uuid4()}",
        )
        replacement_id, _ = _create_candidate(
            connection,
            document_id=document_ids[1],
            entity_id=entity_id,
            field_path="correction.chain",
            suffix=f"chain-replacement-{uuid4()}",
        )
        final_id, _ = _create_candidate(
            connection,
            document_id=document_ids[2],
            entity_id=entity_id,
            field_path="correction.chain",
            suffix=f"chain-final-{uuid4()}",
        )
        wrong_field_id, _ = _create_candidate(
            connection,
            document_id=document_ids[3],
            entity_id=entity_id,
            field_path="correction.other",
            suffix=f"wrong-field-{uuid4()}",
        )
        original_decision = _approve_observation(connection, original_id)
        replacement_decision = _approve_observation(connection, replacement_id)
        final_decision = _approve_observation(connection, final_id)
        wrong_field_decision = _approve_observation(connection, wrong_field_id)

    with pytest.raises(DBAPIError), engine.begin() as connection:
        _insert_correction(
            connection,
            incorrect_id=original_id,
            replacement_id=wrong_field_id,
            decision_id=wrong_field_decision,
        )

    with engine.begin() as connection:
        _insert_correction(
            connection,
            incorrect_id=original_id,
            replacement_id=replacement_id,
            decision_id=replacement_decision,
        )
        _insert_correction(
            connection,
            incorrect_id=replacement_id,
            replacement_id=final_id,
            decision_id=final_decision,
        )

    with engine.connect() as connection:
        published_chain_ids = set(
            connection.scalars(
                text(
                    """
                    SELECT id
                    FROM published_source_observations
                    WHERE id IN (:original_id, :replacement_id, :final_id)
                    """
                ),
                {
                    "original_id": original_id,
                    "replacement_id": replacement_id,
                    "final_id": final_id,
                },
            )
        )
        assert published_chain_ids == {final_id}

    immutable_statements = (
        ("UPDATE source_snapshots SET http_status = 201 WHERE id = :id", snapshot_id),
        ("DELETE FROM source_snapshots WHERE id = :id", snapshot_id),
        (
            "UPDATE review_decisions SET reason = 'changed' WHERE id = :id",
            original_decision,
        ),
        ("DELETE FROM review_decisions WHERE id = :id", original_decision),
        (
            "UPDATE observation_corrections SET reason = 'changed' "
            "WHERE incorrect_observation_id = :id",
            original_id,
        ),
        (
            "DELETE FROM observation_corrections "
            "WHERE incorrect_observation_id = :id",
            original_id,
        ),
        (
            "UPDATE source_observations SET value_text = 'changed' WHERE id = :id",
            original_id,
        ),
        ("DELETE FROM source_observations WHERE id = :id", original_id),
    )
    for statement, record_id in immutable_statements:
        with pytest.raises(DBAPIError), engine.begin() as connection:
            connection.execute(text(statement), {"id": record_id})

    with engine.begin() as connection:
        pending_id, _ = _create_candidate(
            connection,
            document_id=document_ids[4],
            entity_id=uuid4(),
            field_path="publication.latest",
            suffix=f"publication-{uuid4()}",
        )

    with pytest.raises(DBAPIError), engine.begin() as connection:
        connection.execute(
            text(
                """
                INSERT INTO source_observations (
                    id, entity_type, entity_id, field_path, value_text,
                    document_id, snapshot_id, extraction_run_id,
                    classification, review_state, is_published
                )
                SELECT
                    :id, entity_type, :entity_id, 'publication.illegal', value_text,
                    document_id, snapshot_id, extraction_run_id,
                    classification, 'reviewed', TRUE
                FROM source_observations
                WHERE id = :pending_id
                """
            ),
            {"id": uuid4(), "entity_id": uuid4(), "pending_id": pending_id},
        )

    with engine.begin() as connection:
        approval_id = _approve_observation(connection, pending_id)
        connection.execute(
            text(
                """
                INSERT INTO review_decisions (
                    id, observation_id, reviewer_identity, decision, reason,
                    decided_at, previous_decision_id
                ) VALUES (
                    :id, :observation_id, 'integration:reject', 'reject',
                    'latest rejection', :decided_at, :previous_id
                )
                """
            ),
            {
                "id": uuid4(),
                "observation_id": pending_id,
                "decided_at": datetime.now(UTC) + timedelta(seconds=1),
                "previous_id": approval_id,
            },
        )

    with engine.connect() as connection:
        assert connection.scalar(
            text(
                "SELECT count(*) FROM published_source_observations "
                "WHERE id = :observation_id"
            ),
            {"observation_id": pending_id},
        ) == 0

    with pytest.raises(DBAPIError), engine.begin() as connection:
        connection.execute(
            text(
                """
                UPDATE source_observations
                SET review_state = 'reviewed', is_published = TRUE
                WHERE id = :observation_id
                """
            ),
            {"observation_id": pending_id},
        )

    with engine.begin() as connection:
        connection.execute(
            text(
                """
                UPDATE source_observations
                SET review_state = 'rejected', is_published = FALSE
                WHERE id = :observation_id
                """
            ),
            {"observation_id": pending_id},
        )
    engine.dispose()
