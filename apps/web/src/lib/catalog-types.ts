export type Locale = "en" | "te";

export interface ProvenanceSummary {
  source_id: string;
  source_name: string;
  official_source_url: string;
  public_source_url?: string | null;
  retrieval_date: string;
  publication_date: string | null;
  effective_date: string | null;
  review_status: "pending" | "reviewed" | "rejected";
  is_fixture: boolean;
}

export interface AliasSummary {
  value: string;
  language: "en" | "te" | "und";
  kind: "alternate" | "historical";
}

export interface GeographyRecord {
  id: string;
  slug: string;
  entity_type: string;
  name_en: string;
  name_te: string | null;
  official_code: string | null;
  official_code_scheme: string | null;
  parent_id: string | null;
  valid_from: string | null;
  valid_to: string | null;
  is_active: boolean;
  is_pilot: boolean;
  aliases: AliasSummary[];
  has_point: boolean;
  has_boundary: boolean;
  boundary_precision?: string | null;
  boundary_valid_from?: string | null;
  boundary_valid_to?: string | null;
  coverage_note: string | null;
  provenance: ProvenanceSummary;
}

export interface GovernmentBodyRecord {
  id: string;
  slug: string;
  body_type: string;
  name_en: string;
  name_te: string | null;
  official_code: string | null;
  parent_id: string | null;
  valid_from: string | null;
  valid_to: string | null;
  is_active: boolean;
  aliases: AliasSummary[];
  sector: string | null;
  provenance: ProvenanceSummary;
}

export interface PublicOfficeRecord {
  id: string;
  slug: string;
  name_en: string;
  name_te: string | null;
  office_type: string;
  official_code: string | null;
  government_body_id: string;
  valid_from: string | null;
  valid_to: string | null;
  is_active: boolean;
  has_point: boolean;
  provenance: ProvenanceSummary;
}

export interface RepresentativeRecord {
  id: string;
  slug: string;
  name_en: string;
  name_te: string | null;
  valid_from: string | null;
  valid_to: string | null;
  is_active: boolean;
  provenance: ProvenanceSummary;
}

export interface PageResponse<T> {
  data: T[];
  meta: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
}

export interface FeedSourceSummary {
  name: string;
  publisher: string;
  official_source_url: string;
  public_source_url?: string | null;
  access_method: string;
  review_status: "pending" | "reviewed" | "rejected";
}

export interface FeedSnapshotSummary {
  sha256: string;
  retrieved_at: string;
  http_status: number;
  content_type: string;
  file_size_bytes: number;
}

export interface FeedExtractionSummary {
  adapter_name: string;
  adapter_version: string;
  status: string;
  extracted_record_count: number;
  software_revision: string;
}

export interface FeedReviewSummary {
  decision: string;
  decided_at: string;
}

export interface FeedStatus {
  source: FeedSourceSummary;
  latest_snapshot: FeedSnapshotSummary | null;
  latest_extraction: FeedExtractionSummary | null;
  observation_counts: { total: number; published: number };
  latest_review: FeedReviewSummary | null;
}
