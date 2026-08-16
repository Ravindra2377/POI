import type { Locale } from "./catalog-types";

export interface BudgetSourceRecord {
  source_record_id: string;
  source_name: string;
  official_source_url: string;
  public_source_url?: string | null;
  retrieval_date: string;
  review_status: "reviewed";
}

export interface BudgetClaim<T> {
  classification: "official";
  value: T;
  source: BudgetSourceRecord;
}

export interface BudgetLocalizedText {
  en: string;
  te: string;
}

export interface BudgetAmountItem {
  label: string;
  value_text: string;
  rupees: number | string;
}

export interface BudgetLine {
  slug: string;
  fiscal_year: string;
  statement: string;
  code: string;
  name: BudgetClaim<BudgetLocalizedText>;
  unit: string;
  amounts: BudgetAmountItem[];
  budget_estimate: BudgetClaim<BudgetLocalizedText>;
  source: BudgetSourceRecord;
}

export interface BudgetFilters {
  statement: string;
  fiscalYear: string;
  unit: string;
}

export interface BudgetCatalogResponse {
  data: BudgetLine[];
  status: "prepared-empty" | "reviewed";
}

// Production remains empty until budget lines complete source and bilingual review.
export const preparedBudget: readonly BudgetLine[] = [];

export function localizedBudgetText(
  value: BudgetLocalizedText,
  locale: Locale,
): string {
  return locale === "te" && value.te ? value.te : value.en;
}

export function formatRupees(value: number | string): string {
  const numeric = typeof value === "string" ? Number(value) : value;
  return Number.isFinite(numeric)
    ? numeric.toLocaleString("en-IN")
    : String(value);
}

export function filterBudget(
  lines: BudgetLine[],
  filters: BudgetFilters,
): BudgetLine[] {
  return lines.filter((line) => {
    return (
      (!filters.statement || line.statement === filters.statement) &&
      (!filters.fiscalYear || line.fiscal_year === filters.fiscalYear) &&
      (!filters.unit || line.unit === filters.unit)
    );
  });
}

export function preparedBudgetLineBySlug(slug: string): BudgetLine | null {
  return preparedBudget.find((line) => line.slug === slug) ?? null;
}

export async function getBudget(
  signal?: AbortSignal,
): Promise<BudgetCatalogResponse> {
  const response = await fetch("/api/budget", {
    headers: { Accept: "application/json" },
    signal,
  });
  if (!response.ok) {
    throw new Error(`Budget request failed with status ${response.status}`);
  }
  return (await response.json()) as BudgetCatalogResponse;
}
