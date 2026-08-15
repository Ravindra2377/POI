import type { Locale } from "./catalog-types";

export interface LocalizedText {
  en: string;
  te: string;
}

export interface SchemeSourceRecord {
  source_record_id: string;
  source_name: string;
  official_source_url: string;
  retrieval_date: string;
  review_status: "reviewed";
}

export interface OfficialSchemeClaim<T> {
  classification: "official";
  value: T;
  source: SchemeSourceRecord;
}

export interface SchemeRecord {
  slug: string;
  name: OfficialSchemeClaim<LocalizedText>;
  description: OfficialSchemeClaim<LocalizedText>;
  department: OfficialSchemeClaim<LocalizedText>;
  districts: OfficialSchemeClaim<LocalizedText[]>;
  category: OfficialSchemeClaim<LocalizedText>;
  eligibility: OfficialSchemeClaim<LocalizedText[]> | null;
}

export interface SchemeFilters {
  department: string;
  district: string;
  category: string;
  eligibility: "all" | "published" | "unavailable";
}

export interface SchemeCatalogResponse {
  data: SchemeRecord[];
  status: "prepared-empty" | "reviewed";
}

// Production remains empty until records complete source and bilingual review.
export const preparedSchemes: readonly SchemeRecord[] = [];

export function localized(value: LocalizedText, locale: Locale): string {
  return locale === "te" ? value.te : value.en;
}

export function filterSchemes(
  schemes: SchemeRecord[],
  filters: SchemeFilters,
): SchemeRecord[] {
  return schemes.filter((scheme) => {
    const hasEligibility = scheme.eligibility !== null;
    return (
      (!filters.department ||
        scheme.department.value.en === filters.department) &&
      (!filters.district ||
        scheme.districts.value.some(
          (district) => district.en === filters.district,
        )) &&
      (!filters.category || scheme.category.value.en === filters.category) &&
      (filters.eligibility === "all" ||
        (filters.eligibility === "published" && hasEligibility) ||
        (filters.eligibility === "unavailable" && !hasEligibility))
    );
  });
}

export function preparedSchemeBySlug(slug: string): SchemeRecord | null {
  return preparedSchemes.find((scheme) => scheme.slug === slug) ?? null;
}

export async function getSchemes(
  signal?: AbortSignal,
): Promise<SchemeCatalogResponse> {
  const response = await fetch("/api/schemes", {
    headers: { Accept: "application/json" },
    signal,
  });
  if (!response.ok) {
    throw new Error(`Scheme request failed with status ${response.status}`);
  }
  return (await response.json()) as SchemeCatalogResponse;
}
