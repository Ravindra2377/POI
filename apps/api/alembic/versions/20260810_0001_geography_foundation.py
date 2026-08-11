"""Stage 1 geography and government entity foundation.

Revision ID: 20260810_0001
Revises:
Create Date: 2026-08-10
"""

from collections.abc import Sequence

from alembic import op

revision: str = "20260810_0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

POSTGIS_EXTENSION_SQL = "CREATE EXTENSION IF NOT EXISTS postgis"
POSTGIS_PREFLIGHT_SQL = """
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'postgis') THEN
        RAISE EXCEPTION
            'PostGIS is required but unavailable. Enable it on Render PostgreSQL '
            'or grant the migration role permission to CREATE EXTENSION.';
    END IF;
END
$$
"""

TABLE_STATEMENTS = (
    """
    CREATE TABLE IF NOT EXISTS source_references (
        id UUID PRIMARY KEY,
        source_name VARCHAR(240) NOT NULL,
        official_source_url TEXT NOT NULL,
        retrieval_date DATE NOT NULL,
        publication_date DATE,
        effective_date DATE,
        review_status VARCHAR(32) NOT NULL
            CHECK (review_status IN ('pending', 'reviewed', 'rejected')),
        is_fixture BOOLEAN NOT NULL DEFAULT FALSE,
        citation_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS geographies (
        id UUID PRIMARY KEY,
        slug VARCHAR(160) NOT NULL UNIQUE,
        entity_type VARCHAR(40) NOT NULL CHECK (entity_type IN (
            'state', 'district', 'revenue_division', 'mandal', 'village',
            'urban_local_body', 'assembly_constituency',
            'parliamentary_constituency'
        )),
        name_en VARCHAR(240) NOT NULL,
        name_te VARCHAR(240),
        official_code VARCHAR(64),
        official_code_scheme VARCHAR(80),
        parent_id UUID REFERENCES geographies(id) ON DELETE RESTRICT,
        valid_from DATE,
        valid_to DATE,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        is_pilot BOOLEAN NOT NULL DEFAULT FALSE,
        coverage_note TEXT,
        point geometry(Point, 4326),
        boundary geometry(MultiPolygon, 4326),
        centroid geometry(Point, 4326) GENERATED ALWAYS AS (
            CASE WHEN boundary IS NULL THEN NULL ELSE ST_Centroid(boundary) END
        ) STORED,
        boundary_precision VARCHAR(80),
        boundary_valid_from DATE,
        boundary_valid_to DATE,
        boundary_source_id UUID REFERENCES source_references(id) ON DELETE RESTRICT,
        source_id UUID NOT NULL REFERENCES source_references(id) ON DELETE RESTRICT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT ck_geographies_validity_order
            CHECK (valid_to IS NULL OR valid_from IS NULL OR valid_to >= valid_from),
        CONSTRAINT ck_geographies_boundary_validity_order
            CHECK (
                boundary_valid_to IS NULL OR boundary_valid_from IS NULL
                OR boundary_valid_to >= boundary_valid_from
            )
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS geography_aliases (
        id UUID PRIMARY KEY,
        geography_id UUID NOT NULL REFERENCES geographies(id) ON DELETE CASCADE,
        alias VARCHAR(240) NOT NULL,
        language_code VARCHAR(8) NOT NULL CHECK (language_code IN ('en', 'te', 'und')),
        alias_type VARCHAR(24) NOT NULL CHECK (alias_type IN ('alternate', 'historical')),
        valid_from DATE,
        valid_to DATE,
        source_id UUID NOT NULL REFERENCES source_references(id) ON DELETE RESTRICT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_geography_alias_identity UNIQUE (
            geography_id, alias, language_code, alias_type
        ),
        CONSTRAINT ck_geography_aliases_validity_order
            CHECK (valid_to IS NULL OR valid_from IS NULL OR valid_to >= valid_from)
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS geography_relationships (
        id UUID PRIMARY KEY,
        from_geography_id UUID NOT NULL REFERENCES geographies(id) ON DELETE CASCADE,
        to_geography_id UUID NOT NULL REFERENCES geographies(id) ON DELETE CASCADE,
        relationship_type VARCHAR(40) NOT NULL CHECK (relationship_type IN (
            'administrative_contains', 'electoral_contains', 'electoral_overlap', 'covers'
        )),
        valid_from DATE,
        valid_to DATE,
        source_id UUID NOT NULL REFERENCES source_references(id) ON DELETE RESTRICT,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_geography_relationship_identity UNIQUE (
            from_geography_id, to_geography_id, relationship_type, valid_from
        ),
        CONSTRAINT ck_geography_relationships_different_entities
            CHECK (from_geography_id <> to_geography_id),
        CONSTRAINT ck_geography_relationships_validity_order
            CHECK (valid_to IS NULL OR valid_from IS NULL OR valid_to >= valid_from)
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS government_bodies (
        id UUID PRIMARY KEY,
        slug VARCHAR(160) NOT NULL UNIQUE,
        body_type VARCHAR(40) NOT NULL CHECK (body_type IN (
            'state_government', 'department', 'agency', 'local_government',
            'public_sector_body'
        )),
        name_en VARCHAR(240) NOT NULL,
        name_te VARCHAR(240),
        official_code VARCHAR(64),
        parent_id UUID REFERENCES government_bodies(id) ON DELETE RESTRICT,
        valid_from DATE,
        valid_to DATE,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        source_id UUID NOT NULL REFERENCES source_references(id) ON DELETE RESTRICT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT ck_government_bodies_validity_order
            CHECK (valid_to IS NULL OR valid_from IS NULL OR valid_to >= valid_from)
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS government_body_aliases (
        id UUID PRIMARY KEY,
        government_body_id UUID NOT NULL REFERENCES government_bodies(id) ON DELETE CASCADE,
        alias VARCHAR(240) NOT NULL,
        language_code VARCHAR(8) NOT NULL CHECK (language_code IN ('en', 'te', 'und')),
        alias_type VARCHAR(24) NOT NULL CHECK (alias_type IN ('alternate', 'historical')),
        source_id UUID NOT NULL REFERENCES source_references(id) ON DELETE RESTRICT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_government_body_alias_identity UNIQUE (
            government_body_id, alias, language_code, alias_type
        )
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS departments (
        id UUID PRIMARY KEY,
        government_body_id UUID NOT NULL UNIQUE
            REFERENCES government_bodies(id) ON DELETE RESTRICT,
        sector VARCHAR(80) NOT NULL,
        source_id UUID NOT NULL REFERENCES source_references(id) ON DELETE RESTRICT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS government_body_relationships (
        id UUID PRIMARY KEY,
        from_body_id UUID NOT NULL REFERENCES government_bodies(id) ON DELETE CASCADE,
        to_body_id UUID NOT NULL REFERENCES government_bodies(id) ON DELETE CASCADE,
        relationship_type VARCHAR(32) NOT NULL CHECK (relationship_type IN (
            'parent', 'oversight', 'attached', 'predecessor', 'successor'
        )),
        valid_from DATE,
        valid_to DATE,
        source_id UUID NOT NULL REFERENCES source_references(id) ON DELETE RESTRICT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_government_body_relationship_identity UNIQUE (
            from_body_id, to_body_id, relationship_type, valid_from
        ),
        CONSTRAINT ck_government_body_relationships_different_entities
            CHECK (from_body_id <> to_body_id),
        CONSTRAINT ck_government_body_relationships_validity_order
            CHECK (valid_to IS NULL OR valid_from IS NULL OR valid_to >= valid_from)
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS public_offices (
        id UUID PRIMARY KEY,
        slug VARCHAR(160) NOT NULL UNIQUE,
        name_en VARCHAR(240) NOT NULL,
        name_te VARCHAR(240),
        office_type VARCHAR(80) NOT NULL,
        official_code VARCHAR(64),
        government_body_id UUID NOT NULL
            REFERENCES government_bodies(id) ON DELETE RESTRICT,
        parent_office_id UUID REFERENCES public_offices(id) ON DELETE RESTRICT,
        point geometry(Point, 4326),
        valid_from DATE,
        valid_to DATE,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        source_id UUID NOT NULL REFERENCES source_references(id) ON DELETE RESTRICT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT ck_public_offices_validity_order
            CHECK (valid_to IS NULL OR valid_from IS NULL OR valid_to >= valid_from)
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS public_office_aliases (
        id UUID PRIMARY KEY,
        public_office_id UUID NOT NULL REFERENCES public_offices(id) ON DELETE CASCADE,
        alias VARCHAR(240) NOT NULL,
        language_code VARCHAR(8) NOT NULL CHECK (language_code IN ('en', 'te', 'und')),
        alias_type VARCHAR(24) NOT NULL CHECK (alias_type IN ('alternate', 'historical')),
        source_id UUID NOT NULL REFERENCES source_references(id) ON DELETE RESTRICT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_public_office_alias_identity UNIQUE (
            public_office_id, alias, language_code, alias_type
        )
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS office_jurisdictions (
        id UUID PRIMARY KEY,
        public_office_id UUID NOT NULL REFERENCES public_offices(id) ON DELETE CASCADE,
        geography_id UUID NOT NULL REFERENCES geographies(id) ON DELETE CASCADE,
        valid_from DATE,
        valid_to DATE,
        source_id UUID NOT NULL REFERENCES source_references(id) ON DELETE RESTRICT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_office_jurisdiction_identity UNIQUE (
            public_office_id, geography_id, valid_from
        ),
        CONSTRAINT ck_office_jurisdictions_validity_order
            CHECK (valid_to IS NULL OR valid_from IS NULL OR valid_to >= valid_from)
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS official_roles (
        id UUID PRIMARY KEY,
        slug VARCHAR(160) NOT NULL UNIQUE,
        name_en VARCHAR(240) NOT NULL,
        name_te VARCHAR(240),
        government_body_id UUID REFERENCES government_bodies(id) ON DELETE RESTRICT,
        public_office_id UUID REFERENCES public_offices(id) ON DELETE RESTRICT,
        valid_from DATE,
        valid_to DATE,
        source_id UUID NOT NULL REFERENCES source_references(id) ON DELETE RESTRICT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT ck_official_roles_validity_order
            CHECK (valid_to IS NULL OR valid_from IS NULL OR valid_to >= valid_from)
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS representatives (
        id UUID PRIMARY KEY,
        slug VARCHAR(160) NOT NULL UNIQUE,
        name_en VARCHAR(240) NOT NULL,
        name_te VARCHAR(240),
        valid_from DATE,
        valid_to DATE,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        source_id UUID NOT NULL REFERENCES source_references(id) ON DELETE RESTRICT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT ck_representatives_validity_order
            CHECK (valid_to IS NULL OR valid_from IS NULL OR valid_to >= valid_from)
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS representative_terms (
        id UUID PRIMARY KEY,
        representative_id UUID NOT NULL REFERENCES representatives(id) ON DELETE RESTRICT,
        official_role_id UUID NOT NULL REFERENCES official_roles(id) ON DELETE RESTRICT,
        geography_id UUID REFERENCES geographies(id) ON DELETE RESTRICT,
        government_body_id UUID REFERENCES government_bodies(id) ON DELETE RESTRICT,
        appointment_type VARCHAR(24) NOT NULL CHECK (
            appointment_type IN ('elected', 'appointed', 'ex_officio')
        ),
        valid_from DATE NOT NULL,
        valid_to DATE,
        source_id UUID NOT NULL REFERENCES source_references(id) ON DELETE RESTRICT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_representative_term_identity UNIQUE (
            representative_id, official_role_id, valid_from
        ),
        CONSTRAINT ck_representative_terms_validity_order
            CHECK (valid_to IS NULL OR valid_to >= valid_from)
    )
    """,
)

INDEX_STATEMENTS = (
    "CREATE INDEX IF NOT EXISTS ix_geographies_type ON geographies(entity_type)",
    "CREATE INDEX IF NOT EXISTS ix_geographies_parent ON geographies(parent_id)",
    "CREATE INDEX IF NOT EXISTS ix_geographies_name_en ON geographies(name_en)",
    "CREATE INDEX IF NOT EXISTS ix_geographies_name_te ON geographies(name_te)",
    "CREATE INDEX IF NOT EXISTS ix_geographies_code ON geographies(official_code)",
    "CREATE INDEX IF NOT EXISTS ix_geographies_point_gist ON geographies USING GIST(point)",
    "CREATE INDEX IF NOT EXISTS ix_geographies_boundary_gist ON geographies USING GIST(boundary)",
    "CREATE INDEX IF NOT EXISTS ix_geography_aliases_alias ON geography_aliases(alias)",
    "CREATE INDEX IF NOT EXISTS ix_government_bodies_type ON government_bodies(body_type)",
    "CREATE INDEX IF NOT EXISTS ix_government_bodies_name_en ON government_bodies(name_en)",
    "CREATE INDEX IF NOT EXISTS ix_government_bodies_name_te ON government_bodies(name_te)",
    "CREATE INDEX IF NOT EXISTS ix_public_offices_point_gist ON public_offices USING GIST(point)",
    "CREATE INDEX IF NOT EXISTS ix_public_office_aliases_alias ON public_office_aliases(alias)",
    "CREATE INDEX IF NOT EXISTS ix_representatives_name_en ON representatives(name_en)",
    "CREATE INDEX IF NOT EXISTS ix_representatives_name_te ON representatives(name_te)",
)


def upgrade() -> None:
    op.execute(POSTGIS_EXTENSION_SQL)
    op.execute(POSTGIS_PREFLIGHT_SQL)
    for statement in TABLE_STATEMENTS:
        op.execute(statement)
    for statement in INDEX_STATEMENTS:
        op.execute(statement)


def downgrade() -> None:
    for table in (
        "representative_terms",
        "representatives",
        "official_roles",
        "office_jurisdictions",
        "public_office_aliases",
        "public_offices",
        "government_body_relationships",
        "departments",
        "government_body_aliases",
        "government_bodies",
        "geography_relationships",
        "geography_aliases",
        "geographies",
        "source_references",
    ):
        op.execute(f"DROP TABLE IF EXISTS {table} CASCADE")
