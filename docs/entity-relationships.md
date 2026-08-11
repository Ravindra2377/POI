# Stage 1 Entity Relationships

Administrative containment uses `geographies.parent_id`. Electoral and cross-boundary overlap uses
time-bounded `geography_relationships`; it is never inferred from the administrative tree.

```mermaid
erDiagram
  SOURCE_REFERENCE ||--o{ GEOGRAPHY : supports
  GEOGRAPHY ||--o{ GEOGRAPHY_ALIAS : has
  GEOGRAPHY ||--o{ GEOGRAPHY : administrative_parent
  GEOGRAPHY ||--o{ GEOGRAPHY_RELATIONSHIP : from
  GEOGRAPHY ||--o{ GEOGRAPHY_RELATIONSHIP : to
  SOURCE_REFERENCE ||--o{ GOVERNMENT_BODY : supports
  GOVERNMENT_BODY ||--o{ GOVERNMENT_BODY_ALIAS : has
  GOVERNMENT_BODY ||--o| DEPARTMENT : classifies
  GOVERNMENT_BODY ||--o{ GOVERNMENT_BODY_RELATIONSHIP : relates
  GOVERNMENT_BODY ||--o{ PUBLIC_OFFICE : operates
  PUBLIC_OFFICE ||--o{ OFFICE_JURISDICTION : serves
  GEOGRAPHY ||--o{ OFFICE_JURISDICTION : covered_by
  OFFICIAL_ROLE ||--o{ REPRESENTATIVE_TERM : defines
  REPRESENTATIVE ||--o{ REPRESENTATIVE_TERM : holds
```

The geography type enum covers state, district, revenue division, mandal, village, urban local
body, assembly constituency, and parliamentary constituency. Administrative child types are
validated independently of electoral overlap. A constituency may overlap many districts or
mandals through relationship rows, with independent validity and source references.

Government bodies, body relationships, offices, jurisdictions, roles, representatives, and terms
carry validity periods. Changes append a new relationship or term; they do not overwrite the prior
row. Stage 1 exposes read-only projections and seeds no representatives.

## Geometry

Points use SRID 4326 and boundaries use SRID 4326 multipolygons. GIST indexes support both.
A stored generated centroid is derived only when a boundary exists. Boundary precision, source,
and validity are optional metadata. The reviewed Stage 1 seed contains no fabricated geometry;
all seeded records therefore report that boundary coverage is unavailable.
