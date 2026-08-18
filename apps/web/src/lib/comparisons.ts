import type { Locale } from "./catalog-types";

export interface ComparisonLocalizedText {
  en: string;
  te: string;
}

export interface ComparisonObservation {
  observation_id: string;
  label: ComparisonLocalizedText;
  value: ComparisonLocalizedText;
  source_name: string;
  official_source_url?: string | null;
  public_source_url?: string | null;
  review_status: "reviewed";
}

export interface ClaimRecordComparison {
  id: string;
  comparison_kind: string;
  entity_type: string;
  entity_id: string;
  entity_label: ComparisonLocalizedText;
  verdict: "consistent" | "divergent" | "insufficient_data";
  classification: "calculated";
  claim: ComparisonObservation;
  record: ComparisonObservation;
  difference?: number | string | null;
  difference_percent?: number | string | null;
  tolerance_percent: number | string;
  method: ComparisonLocalizedText;
  reviewer_identity?: string | null;
  decided_at?: string | null;
  created_at: string;
}

export interface ComparisonCatalogResponse {
  data: ClaimRecordComparison[];
  status: "prepared-empty" | "reviewed";
}

// Production remains empty until reviewed comparisons are deployed. No
// comparison is fabricated; every published row pairs two reviewed official
// observations.
export const preparedComparisons: readonly ClaimRecordComparison[] = [];

export function localizedComparisonText(
  value: ComparisonLocalizedText,
  locale: Locale,
): string {
  return locale === "te" && value.te ? value.te : value.en;
}

export function formatComparisonRupees(value: number | string): string {
  const numeric = typeof value === "string" ? Number(value) : value;
  return Number.isFinite(numeric)
    ? numeric.toLocaleString("en-IN")
    : String(value);
}

export async function getComparisons(
  signal?: AbortSignal,
): Promise<ComparisonCatalogResponse> {
  const response = await fetch("/api/comparisons", {
    headers: { Accept: "application/json" },
    signal,
  });
  if (!response.ok) {
    throw new Error(`Comparison request failed with status ${response.status}`);
  }
  return (await response.json()) as ComparisonCatalogResponse;
}
