import type { Locale } from "./catalog-types";

export interface PublicMoneyLocalizedText {
  en: string;
  te: string;
}

export interface MoneySourceRecord {
  source_record_id: string;
  source_name: string;
  official_source_url: string;
  public_source_url?: string | null;
  retrieval_date: string;
  review_status: "reviewed";
}

export interface OfficialMoneyClaim<T> {
  classification: "official";
  value: T;
  source: MoneySourceRecord;
}

export interface MoneyAmount {
  currency: string;
  value: number;
}

export interface BudgetAmountItem {
  label: string;
  value_text: string;
  rupees: number;
}

export interface PublicMoneyRecord {
  slug: string;
  title: OfficialMoneyClaim<PublicMoneyLocalizedText>;
  stage: OfficialMoneyClaim<PublicMoneyLocalizedText>;
  description: OfficialMoneyClaim<PublicMoneyLocalizedText>;
  department: OfficialMoneyClaim<PublicMoneyLocalizedText>;
  districts: OfficialMoneyClaim<PublicMoneyLocalizedText[]>;
  reporting_period: OfficialMoneyClaim<PublicMoneyLocalizedText> | null;
  amount: OfficialMoneyClaim<MoneyAmount> | null;
  fiscal_year?: string;
  statement?: string;
  code?: string;
  unit?: string;
  amounts?: BudgetAmountItem[];
}

export interface PublicMoneyFilters {
  stage: string;
  department: string;
  district: string;
  amount: "all" | "published" | "unavailable";
}

export interface PublicMoneyCatalogResponse {
  data: PublicMoneyRecord[];
  status: "prepared-empty" | "reviewed";
}

// Production remains empty until every financial observation completes source and bilingual review.
export const preparedPublicMoney: readonly PublicMoneyRecord[] = [];

export function localizedMoneyText(
  value: PublicMoneyLocalizedText,
  locale: Locale,
): string {
  return locale === "te" && value.te ? value.te : value.en;
}

export function formatMoneyAmount(amount: MoneyAmount): string {
  const formatted = amount.value.toLocaleString("en-IN");
  return amount.currency === "INR"
    ? `₹${formatted}`
    : `${formatted} ${amount.currency}`;
}

export function filterPublicMoney(
  records: PublicMoneyRecord[],
  filters: PublicMoneyFilters,
): PublicMoneyRecord[] {
  return records.filter((record) => {
    const hasAmount = record.amount !== null;
    return (
      (!filters.stage || record.stage.value.en === filters.stage) &&
      (!filters.department ||
        record.department.value.en === filters.department) &&
      (!filters.district ||
        record.districts.value.some(
          (district) => district.en === filters.district,
        )) &&
      (filters.amount === "all" ||
        (filters.amount === "published" && hasAmount) ||
        (filters.amount === "unavailable" && !hasAmount))
    );
  });
}

export function preparedMoneyBySlug(slug: string): PublicMoneyRecord | null {
  return preparedPublicMoney.find((record) => record.slug === slug) ?? null;
}

export async function getPublicMoney(
  signal?: AbortSignal,
): Promise<PublicMoneyCatalogResponse> {
  const response = await fetch("/api/public-money", {
    headers: { Accept: "application/json" },
    signal,
  });
  if (!response.ok) {
    throw new Error(
      `Public-money request failed with status ${response.status}`,
    );
  }
  return (await response.json()) as PublicMoneyCatalogResponse;
}
