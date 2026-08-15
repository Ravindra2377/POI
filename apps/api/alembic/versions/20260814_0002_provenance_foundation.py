"""Stage 2A/2B append-only provenance foundation and Stage 1 bridge backfill.

Revision ID: 20260814_0002
Revises: 20260810_0001
Create Date: 2026-08-14
"""

from collections.abc import Sequence

from alembic import op

revision: str = "20260814_0002"
down_revision: str | None = "20260810_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

TABLE_STATEMENTS = (
    """
    CREATE TABLE sources (
        id UUID PRIMARY KEY,
        name VARCHAR(240) NOT NULL,
        publisher VARCHAR(240) NOT NULL,
        official_domain VARCHAR(253) NOT NULL,
        source_type VARCHAR(80) NOT NULL,
        jurisdiction_code VARCHAR(32) NOT NULL,
        access_method VARCHAR(24) NOT NULL CHECK (
            access_method IN ('api', 'html', 'csv', 'xlsx', 'pdf', 'dashboard', 'manual')
        ),
        licence_status VARCHAR(120),
        reuse_status VARCHAR(120),
        active_from DATE,
        active_to DATE,
        review_status VARCHAR(32) NOT NULL CHECK (
            review_status IN ('pending', 'reviewed', 'rejected')
        ),
        legacy_source_reference_id UUID UNIQUE
            REFERENCES source_references(id) ON DELETE RESTRICT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT ck_sources_active_period CHECK (
            active_to IS NULL OR active_from IS NULL OR active_to >= active_from
        )
    )
    """,
    """
    CREATE TABLE source_documents (
        id UUID PRIMARY KEY,
        source_id UUID NOT NULL REFERENCES sources(id) ON DELETE RESTRICT,
        official_url TEXT NOT NULL,
        title VARCHAR(500) NOT NULL,
        publication_date DATE,
        reporting_period_start DATE,
        reporting_period_end DATE,
        document_type VARCHAR(80) NOT NULL,
        language_code VARCHAR(8) NOT NULL CHECK (language_code IN ('en', 'te', 'und')),
        jurisdiction_code VARCHAR(32) NOT NULL,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_source_documents_source_url UNIQUE (source_id, official_url),
        CONSTRAINT ck_source_documents_reporting_period CHECK (
            reporting_period_end IS NULL OR reporting_period_start IS NULL
            OR reporting_period_end >= reporting_period_start
        )
    )
    """,
    """
    CREATE TABLE source_snapshots (
        id UUID PRIMARY KEY,
        document_id UUID NOT NULL REFERENCES source_documents(id) ON DELETE RESTRICT,
        retrieved_at TIMESTAMPTZ NOT NULL,
        http_status INTEGER NOT NULL CHECK (http_status BETWEEN 100 AND 599),
        content_type VARCHAR(255) NOT NULL,
        file_size_bytes BIGINT NOT NULL,
        sha256 VARCHAR(64) NOT NULL,
        object_storage_key TEXT NOT NULL UNIQUE,
        original_filename VARCHAR(500),
        retrieval_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        duplicate_of_snapshot_id UUID REFERENCES source_snapshots(id) ON DELETE RESTRICT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_source_snapshots_document_checksum UNIQUE (document_id, sha256),
        CONSTRAINT ck_source_snapshots_nonnegative_file_size CHECK (file_size_bytes >= 0),
        CONSTRAINT ck_source_snapshots_sha256_format CHECK (sha256 ~ '^[0-9a-f]{64}$')
    )
    """,
    """
    CREATE TABLE extraction_runs (
        id UUID PRIMARY KEY,
        snapshot_id UUID NOT NULL REFERENCES source_snapshots(id) ON DELETE RESTRICT,
        adapter_name VARCHAR(160) NOT NULL,
        adapter_version VARCHAR(80) NOT NULL,
        started_at TIMESTAMPTZ NOT NULL,
        completed_at TIMESTAMPTZ,
        status VARCHAR(24) NOT NULL CHECK (
            status IN ('pending', 'running', 'succeeded', 'failed', 'quarantined')
        ),
        error_summary TEXT,
        extracted_record_count INTEGER NOT NULL DEFAULT 0,
        parser_configuration JSONB NOT NULL DEFAULT '{}'::jsonb,
        software_revision VARCHAR(80) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_extraction_runs_identity UNIQUE (
            snapshot_id, adapter_name, adapter_version, software_revision
        ),
        CONSTRAINT ck_extraction_runs_completion_order CHECK (
            completed_at IS NULL OR completed_at >= started_at
        ),
        CONSTRAINT ck_extraction_runs_nonnegative_record_count CHECK (
            extracted_record_count >= 0
        )
    )
    """,
    """
    CREATE TABLE source_observations (
        id UUID PRIMARY KEY,
        entity_type VARCHAR(80) NOT NULL,
        entity_id UUID NOT NULL,
        field_path VARCHAR(240) NOT NULL,
        value_text TEXT,
        value_number NUMERIC,
        value_boolean BOOLEAN,
        value_date DATE,
        value_json JSONB,
        unit VARCHAR(80),
        reporting_period_start DATE,
        reporting_period_end DATE,
        geography_id UUID REFERENCES geographies(id) ON DELETE RESTRICT,
        document_id UUID NOT NULL REFERENCES source_documents(id) ON DELETE RESTRICT,
        snapshot_id UUID REFERENCES source_snapshots(id) ON DELETE RESTRICT,
        extraction_run_id UUID REFERENCES extraction_runs(id) ON DELETE RESTRICT,
        legacy_source_reference_id UUID
            REFERENCES source_references(id) ON DELETE RESTRICT,
        classification VARCHAR(32) NOT NULL CHECK (
            classification IN ('official', 'calculated', 'inferred', 'community_reported')
        ),
        confidence NUMERIC(5, 4),
        review_state VARCHAR(24) NOT NULL CHECK (
            review_state IN ('pending', 'reviewed', 'rejected', 'superseded')
        ),
        valid_from DATE,
        valid_to DATE,
        is_published BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_source_observations_legacy_identity UNIQUE (
            entity_type, entity_id, field_path, document_id
        ),
        CONSTRAINT ck_source_observations_provenance_origin CHECK (
            (
                legacy_source_reference_id IS NOT NULL
                AND snapshot_id IS NULL
                AND extraction_run_id IS NULL
            ) OR (
                legacy_source_reference_id IS NULL
                AND snapshot_id IS NOT NULL
                AND extraction_run_id IS NOT NULL
            )
        ),
        CONSTRAINT ck_source_observations_single_value CHECK (
            num_nonnulls(value_text, value_number, value_boolean, value_date, value_json) = 1
        ),
        CONSTRAINT ck_source_observations_reporting_period CHECK (
            reporting_period_end IS NULL OR reporting_period_start IS NULL
            OR reporting_period_end >= reporting_period_start
        ),
        CONSTRAINT ck_source_observations_validity_period CHECK (
            valid_to IS NULL OR valid_from IS NULL OR valid_to >= valid_from
        ),
        CONSTRAINT ck_source_observations_confidence_range CHECK (
            confidence IS NULL OR (confidence >= 0 AND confidence <= 1)
        ),
        CONSTRAINT ck_source_observations_reviewed_before_publication CHECK (
            NOT is_published OR review_state = 'reviewed'
        )
    )
    """,
    """
    CREATE TABLE review_decisions (
        id UUID PRIMARY KEY,
        observation_id UUID REFERENCES source_observations(id) ON DELETE RESTRICT,
        extraction_run_id UUID REFERENCES extraction_runs(id) ON DELETE RESTRICT,
        reviewer_identity VARCHAR(240) NOT NULL,
        decision VARCHAR(24) NOT NULL CHECK (
            decision IN ('approve', 'reject', 'request_changes')
        ),
        reason TEXT NOT NULL,
        decided_at TIMESTAMPTZ NOT NULL,
        previous_decision_id UUID REFERENCES review_decisions(id) ON DELETE RESTRICT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT ck_review_decisions_single_target CHECK (
            (observation_id IS NOT NULL)::int + (extraction_run_id IS NOT NULL)::int = 1
        )
    )
    """,
    """
    CREATE TABLE observation_corrections (
        id UUID PRIMARY KEY,
        incorrect_observation_id UUID NOT NULL
            REFERENCES source_observations(id) ON DELETE RESTRICT,
        superseding_observation_id UUID NOT NULL
            REFERENCES source_observations(id) ON DELETE RESTRICT,
        reason TEXT NOT NULL,
        review_decision_id UUID NOT NULL
            REFERENCES review_decisions(id) ON DELETE RESTRICT,
        corrected_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_observation_corrections_incorrect_observation UNIQUE (
            incorrect_observation_id
        ),
        CONSTRAINT ck_observation_corrections_different_observations CHECK (
            incorrect_observation_id <> superseding_observation_id
        )
    )
    """,
)

INDEX_STATEMENTS = (
    "CREATE INDEX ix_sources_jurisdiction_code ON sources(jurisdiction_code)",
    "CREATE INDEX ix_source_documents_source_id ON source_documents(source_id)",
    "CREATE INDEX ix_source_documents_jurisdiction_code ON source_documents(jurisdiction_code)",
    "CREATE INDEX ix_source_snapshots_document_id ON source_snapshots(document_id)",
    "CREATE INDEX ix_source_snapshots_sha256 ON source_snapshots(sha256)",
    "CREATE INDEX ix_extraction_runs_snapshot_id ON extraction_runs(snapshot_id)",
    "CREATE INDEX ix_source_observations_document_id ON source_observations(document_id)",
    "CREATE INDEX ix_source_observations_entity ON source_observations(entity_type, entity_id)",
    "CREATE INDEX ix_source_observations_review_state ON source_observations(review_state)",
    "CREATE UNIQUE INDEX uq_review_decisions_previous "
    "ON review_decisions(previous_decision_id) WHERE previous_decision_id IS NOT NULL",
    "CREATE UNIQUE INDEX uq_review_decisions_observation_root "
    "ON review_decisions(observation_id) "
    "WHERE previous_decision_id IS NULL AND observation_id IS NOT NULL",
    "CREATE UNIQUE INDEX uq_review_decisions_extraction_root "
    "ON review_decisions(extraction_run_id) "
    "WHERE previous_decision_id IS NULL AND extraction_run_id IS NOT NULL",
)

IMMUTABILITY_FUNCTION = """
CREATE FUNCTION reject_provenance_mutation() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION '% is append-only; create a superseding record instead', TG_TABLE_NAME;
END;
$$
"""

IMMUTABLE_TABLES = (
    "source_snapshots",
    "review_decisions",
    "observation_corrections",
)


REVIEW_DECISION_CHAIN_GUARD = """
CREATE FUNCTION validate_review_decision_chain() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
    target_lock_key TEXT;
    latest_decision_id UUID;
    latest_decided_at TIMESTAMPTZ;
BEGIN
    target_lock_key := CASE
        WHEN NEW.observation_id IS NOT NULL THEN 'observation:' || NEW.observation_id::text
        ELSE 'extraction:' || NEW.extraction_run_id::text
    END;
    PERFORM pg_advisory_xact_lock(hashtextextended(target_lock_key, 0));

    SELECT id, decided_at INTO latest_decision_id, latest_decided_at
    FROM review_decisions
    WHERE observation_id IS NOT DISTINCT FROM NEW.observation_id
      AND extraction_run_id IS NOT DISTINCT FROM NEW.extraction_run_id
    ORDER BY decided_at DESC, created_at DESC, id DESC
    LIMIT 1;

    IF latest_decision_id IS NULL AND NEW.previous_decision_id IS NOT NULL THEN
        RAISE EXCEPTION 'first review decision cannot reference a previous decision';
    END IF;

    IF latest_decision_id IS NOT NULL
       AND NEW.previous_decision_id IS DISTINCT FROM latest_decision_id THEN
        RAISE EXCEPTION
            'review decision must reference the latest decision %', latest_decision_id;
    END IF;

    IF latest_decided_at IS NOT NULL AND NEW.decided_at <= latest_decided_at THEN
        RAISE EXCEPTION
            'review decision time must be later than the current decision time';
    END IF;

    RETURN NEW;
END;
$$
"""


OBSERVATION_REVIEW_GUARD = """
CREATE FUNCTION guard_observation_review_transition() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
    latest_decision VARCHAR(24);
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.review_state <> 'pending' OR NEW.is_published THEN
            RAISE EXCEPTION
                'new source observations must begin pending and unpublished';
        END IF;
        RETURN NEW;
    END IF;

    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION
            'source_observations is append-only; create a superseding record instead';
    END IF;

    IF (
        to_jsonb(NEW) - 'review_state' - 'is_published'
    ) IS DISTINCT FROM (
        to_jsonb(OLD) - 'review_state' - 'is_published'
    ) THEN
        RAISE EXCEPTION
            'source observation values are immutable; create a superseding observation';
    END IF;

    SELECT decision INTO latest_decision
    FROM review_decisions
    WHERE observation_id = OLD.id
    ORDER BY decided_at DESC, created_at DESC, id DESC
    LIMIT 1;

    IF latest_decision IS NULL OR NOT (
        (latest_decision = 'approve' AND NEW.review_state = 'reviewed')
        OR (latest_decision = 'reject' AND NEW.review_state = 'rejected')
        OR (latest_decision = 'request_changes' AND NEW.review_state = 'pending')
    ) THEN
        RAISE EXCEPTION
            'observation review state must match its latest immutable review decision';
    END IF;

    RETURN NEW;
END;
$$
"""

CORRECTION_VALIDATION = """
CREATE FUNCTION validate_observation_correction() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM source_observations AS incorrect
        JOIN source_observations AS replacement
          ON replacement.id = NEW.superseding_observation_id
        JOIN review_decisions AS decision
          ON decision.id = NEW.review_decision_id
        WHERE incorrect.id = NEW.incorrect_observation_id
          AND replacement.entity_type = incorrect.entity_type
          AND replacement.entity_id = incorrect.entity_id
          AND replacement.field_path = incorrect.field_path
          AND replacement.review_state = 'reviewed'
          AND decision.observation_id = replacement.id
          AND decision.decision = 'approve'
          AND decision.id = (
              SELECT latest.id
              FROM review_decisions AS latest
              WHERE latest.observation_id = replacement.id
              ORDER BY latest.decided_at DESC, latest.created_at DESC, latest.id DESC
              LIMIT 1
          )
    ) THEN
        RAISE EXCEPTION
            'correction requires the latest approval for a reviewed replacement of the same field';
    END IF;

    RETURN NEW;
END;
$$
"""

BACKFILL_SOURCES = """
INSERT INTO sources (
    id,
    name,
    publisher,
    official_domain,
    source_type,
    jurisdiction_code,
    access_method,
    licence_status,
    reuse_status,
    active_from,
    active_to,
    review_status,
    legacy_source_reference_id,
    created_at,
    updated_at
)
SELECT
    id,
    source_name,
    source_name,
    lower(split_part(official_source_url, '/', 3)),
    'stage1_reference',
    'IN-AP',
    'manual',
    NULL,
    NULL,
    effective_date,
    NULL,
    review_status,
    id,
    created_at,
    updated_at
FROM source_references
"""

BACKFILL_DOCUMENTS = """
INSERT INTO source_documents (
    id,
    source_id,
    official_url,
    title,
    publication_date,
    reporting_period_start,
    reporting_period_end,
    document_type,
    language_code,
    jurisdiction_code,
    metadata,
    created_at,
    updated_at
)
SELECT
    id,
    id,
    official_source_url,
    source_name,
    publication_date,
    effective_date,
    effective_date,
    'stage1_reference',
    'und',
    'IN-AP',
    jsonb_build_object(
        'legacy_source_reference_id', id,
        'raw_snapshot_status', 'unavailable_legacy_source_reference',
        'retrieval_date', retrieval_date,
        'citation_metadata', citation_metadata,
        'notes', notes,
        'is_fixture', is_fixture
    ),
    created_at,
    updated_at
FROM source_references
"""

BACKFILL_OBSERVATIONS = """
INSERT INTO source_observations (
    id,
    entity_type,
    entity_id,
    field_path,
    value_json,
    document_id,
    legacy_source_reference_id,
    classification,
    review_state,
    valid_from,
    is_published,
    created_at
)
SELECT
    id,
    'source_reference',
    id,
    'legacy_reference',
    jsonb_build_object(
        'source_name', source_name,
        'official_source_url', official_source_url,
        'retrieval_date', retrieval_date,
        'publication_date', publication_date,
        'effective_date', effective_date,
        'citation_metadata', citation_metadata,
        'notes', notes,
        'is_fixture', is_fixture
    ),
    id,
    id,
    'official',
    CASE WHEN review_status = 'reviewed' THEN 'reviewed' ELSE review_status END,
    effective_date,
    review_status = 'reviewed',
    created_at
FROM source_references
"""

BACKFILL_REVIEWS = """
INSERT INTO review_decisions (
    id,
    observation_id,
    reviewer_identity,
    decision,
    reason,
    decided_at,
    created_at
)
SELECT
    id,
    id,
    'system:stage2-legacy-backfill',
    CASE
        WHEN review_status = 'reviewed' THEN 'approve'
        WHEN review_status = 'rejected' THEN 'reject'
        ELSE 'request_changes'
    END,
    'Imported from the explicit Stage 1 source-reference review state; '
        || 'raw bytes were not retained.',
    created_at,
    created_at
FROM source_references
"""

PUBLIC_VIEW = """
CREATE VIEW published_source_observations AS
SELECT
    observation.id,
    observation.entity_type,
    observation.entity_id,
    observation.field_path,
    observation.value_text,
    observation.value_number,
    observation.value_boolean,
    observation.value_date,
    observation.value_json,
    observation.unit,
    observation.reporting_period_start,
    observation.reporting_period_end,
    observation.geography_id,
    observation.classification,
    observation.valid_from,
    observation.valid_to,
    observation.created_at,
    source.id AS source_id,
    source.name AS source_name,
    source.publisher,
    document.id AS document_id,
    document.title AS document_title,
    document.official_url,
    document.publication_date,
    snapshot.id AS snapshot_id,
    snapshot.retrieved_at,
    snapshot.sha256
FROM source_observations AS observation
JOIN source_documents AS document ON document.id = observation.document_id
JOIN sources AS source ON source.id = document.source_id
LEFT JOIN source_snapshots AS snapshot ON snapshot.id = observation.snapshot_id
WHERE observation.is_published = TRUE
  AND observation.review_state = 'reviewed'
  AND (
      SELECT decision.decision
      FROM review_decisions AS decision
      WHERE decision.observation_id = observation.id
      ORDER BY decision.decided_at DESC, decision.created_at DESC, decision.id DESC
      LIMIT 1
  ) = 'approve'
  AND NOT EXISTS (
      SELECT 1
      FROM observation_corrections AS correction
      WHERE correction.incorrect_observation_id = observation.id
  )
"""


def upgrade() -> None:
    for statement in TABLE_STATEMENTS:
        op.execute(statement)
    for statement in INDEX_STATEMENTS:
        op.execute(statement)

    op.execute(BACKFILL_SOURCES)
    op.execute(BACKFILL_DOCUMENTS)
    op.execute(BACKFILL_OBSERVATIONS)
    op.execute(BACKFILL_REVIEWS)

    op.execute(IMMUTABILITY_FUNCTION)
    for table in IMMUTABLE_TABLES:
        op.execute(
            f"""
            CREATE TRIGGER trg_{table}_append_only
            BEFORE UPDATE OR DELETE ON {table}
            FOR EACH ROW EXECUTE FUNCTION reject_provenance_mutation()
            """
        )

    op.execute(REVIEW_DECISION_CHAIN_GUARD)
    op.execute(
        """
        CREATE TRIGGER trg_review_decisions_validate_chain
        BEFORE INSERT ON review_decisions
        FOR EACH ROW EXECUTE FUNCTION validate_review_decision_chain()
        """
    )

    op.execute(OBSERVATION_REVIEW_GUARD)
    op.execute(
        """
        CREATE TRIGGER trg_source_observations_guard
        BEFORE INSERT OR UPDATE OR DELETE ON source_observations
        FOR EACH ROW EXECUTE FUNCTION guard_observation_review_transition()
        """
    )
    op.execute(CORRECTION_VALIDATION)
    op.execute(
        """
        CREATE TRIGGER trg_observation_corrections_validate
        BEFORE INSERT ON observation_corrections
        FOR EACH ROW EXECUTE FUNCTION validate_observation_correction()
        """
    )

    op.execute(PUBLIC_VIEW)


def downgrade() -> None:
    op.execute("DROP VIEW IF EXISTS published_source_observations")
    op.execute(
        "DROP TRIGGER IF EXISTS trg_observation_corrections_validate ON observation_corrections"
    )
    op.execute("DROP TRIGGER IF EXISTS trg_source_observations_guard ON source_observations")
    op.execute(
        "DROP TRIGGER IF EXISTS trg_review_decisions_validate_chain ON review_decisions"
    )

    for table in reversed(IMMUTABLE_TABLES):
        op.execute(f"DROP TRIGGER IF EXISTS trg_{table}_append_only ON {table}")

    for table in (
        "observation_corrections",
        "review_decisions",
        "source_observations",
        "extraction_runs",
        "source_snapshots",
        "source_documents",
        "sources",
    ):
        op.execute(f"DROP TABLE IF EXISTS {table}")

    op.execute("DROP FUNCTION IF EXISTS reject_provenance_mutation()")
    op.execute("DROP FUNCTION IF EXISTS validate_observation_correction()")
    op.execute("DROP FUNCTION IF EXISTS guard_observation_review_transition()")
    op.execute("DROP FUNCTION IF EXISTS validate_review_decision_chain()")
