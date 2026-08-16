import type { Locale } from "./catalog-types";

export interface ElectionResultLocalizedText {
  en: string;
  te: string;
}

export interface ElectionResultSourceRecord {
  source_record_id: string;
  source_name: string;
  official_source_url: string;
  public_source_url?: string | null;
  retrieval_date: string;
  review_status: "reviewed";
}

export interface OfficialElectionResultClaim<T> {
  classification: "official";
  value: T;
  source: ElectionResultSourceRecord;
}

export interface ElectionResultRecord {
  slug: string;
  term_id: number;
  member_sl_no: string;
  constituency_no: string;
  reserved_category: string;
  member_name: OfficialElectionResultClaim<ElectionResultLocalizedText>;
  constituency: OfficialElectionResultClaim<ElectionResultLocalizedText>;
  district: OfficialElectionResultClaim<ElectionResultLocalizedText>;
  party: OfficialElectionResultClaim<ElectionResultLocalizedText> | null;
  term_period: OfficialElectionResultClaim<ElectionResultLocalizedText>;
  elected_via: OfficialElectionResultClaim<string>;
  seat_status: OfficialElectionResultClaim<string>;
  annotation: OfficialElectionResultClaim<ElectionResultLocalizedText> | null;
}

export interface ElectionResultFilters {
  district: string;
  party: string;
  term: string;
  seatStatus: string;
}

export interface ElectionResultCatalogResponse {
  data: ElectionResultRecord[];
  status: "prepared-empty" | "reviewed";
}

// Production remains empty until the reviewed term PDFs are deployed to a
// database and this slice's source and bilingual review completes.
export const preparedElectionResults: readonly ElectionResultRecord[] = [];

export function localizedElectionResultText(
  value: ElectionResultLocalizedText,
  locale: Locale,
): string {
  return locale === "te" ? value.te : value.en;
}

export function filterElectionResults(
  records: ElectionResultRecord[],
  filters: ElectionResultFilters,
): ElectionResultRecord[] {
  return records.filter((record) => {
    const matchesSeat =
      !filters.seatStatus || record.seat_status.value === filters.seatStatus;
    return (
      (!filters.district || record.district.value.en === filters.district) &&
      (!filters.party || record.party?.value.en === filters.party) &&
      (!filters.term || String(record.term_id) === filters.term) &&
      matchesSeat
    );
  });
}

export function preparedElectionResultBySlug(
  slug: string,
): ElectionResultRecord | null {
  return preparedElectionResults.find((record) => record.slug === slug) ?? null;
}

export async function getElectionResults(
  signal?: AbortSignal,
): Promise<ElectionResultCatalogResponse> {
  const response = await fetch("/api/election-results", {
    headers: { Accept: "application/json" },
    signal,
  });
  if (!response.ok) {
    throw new Error(
      `Election result request failed with status ${response.status}`,
    );
  }
  return (await response.json()) as ElectionResultCatalogResponse;
}
