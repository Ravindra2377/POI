import type { Locale } from "./catalog-types";

export interface OfficeholderLocalizedText {
  en: string;
  te: string;
}

export interface OfficeholderSourceRecord {
  source_record_id: string;
  source_name: string;
  official_source_url: string;
  retrieval_date: string;
  review_status: "reviewed";
}

export interface OfficialOfficeholderClaim<T> {
  classification: "official";
  value: T;
  source: OfficeholderSourceRecord;
}

export interface OfficeholderRecord {
  slug: string;
  title: OfficialOfficeholderClaim<OfficeholderLocalizedText>;
  holder: OfficialOfficeholderClaim<OfficeholderLocalizedText>;
  office: OfficialOfficeholderClaim<OfficeholderLocalizedText>;
  body: OfficialOfficeholderClaim<OfficeholderLocalizedText>;
  description: OfficialOfficeholderClaim<OfficeholderLocalizedText>;
  districts: OfficialOfficeholderClaim<OfficeholderLocalizedText[]>;
  term_start: OfficialOfficeholderClaim<string>;
  term_end: OfficialOfficeholderClaim<string> | null;
}

export interface OfficeholderFilters {
  office: string;
  body: string;
  district: string;
  termDates: "all" | "published" | "unavailable";
}

export interface OfficeholderCatalogResponse {
  data: OfficeholderRecord[];
  status: "prepared-empty" | "reviewed";
}

// Production remains empty until every role and term completes source and bilingual review.
export const preparedOfficeholders: readonly OfficeholderRecord[] = [];

export function localizedOfficeholderText(
  value: OfficeholderLocalizedText,
  locale: Locale,
): string {
  return locale === "te" ? value.te : value.en;
}

export function filterOfficeholders(
  records: OfficeholderRecord[],
  filters: OfficeholderFilters,
): OfficeholderRecord[] {
  return records.filter((record) => {
    const hasTermEnd = record.term_end !== null;
    return (
      (!filters.office || record.office.value.en === filters.office) &&
      (!filters.body || record.body.value.en === filters.body) &&
      (!filters.district ||
        record.districts.value.some(
          (district) => district.en === filters.district,
        )) &&
      (filters.termDates === "all" ||
        (filters.termDates === "published" && hasTermEnd) ||
        (filters.termDates === "unavailable" && !hasTermEnd))
    );
  });
}

export function preparedOfficeholderBySlug(
  slug: string,
): OfficeholderRecord | null {
  return preparedOfficeholders.find((record) => record.slug === slug) ?? null;
}

export async function getOfficeholders(
  signal?: AbortSignal,
): Promise<OfficeholderCatalogResponse> {
  const response = await fetch("/api/officeholders", {
    headers: { Accept: "application/json" },
    signal,
  });
  if (!response.ok) {
    throw new Error(
      `Officeholder request failed with status ${response.status}`,
    );
  }
  return (await response.json()) as OfficeholderCatalogResponse;
}
