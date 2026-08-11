export type Locale = "en" | "te";

export interface ProvenanceSummary {
  source_id: string;
  source_name: string;
  official_source_url: string;
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

export interface PageResponse<T> {
  data: T[];
  meta: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
}
