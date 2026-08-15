import type { Locale } from "./catalog-types";

export interface ProcurementLocalizedText {
  en: string;
  te: string;
}

export interface ProcurementSourceRecord {
  source_record_id: string;
  source_name: string;
  official_source_url: string;
  public_source_url?: string | null;
  retrieval_date: string;
  review_status: "reviewed";
}

export interface OfficialProcurementClaim<T> {
  classification: "official";
  value: T;
  source: ProcurementSourceRecord;
}

export interface ContractAmount {
  currency: string;
  value: number;
}

export interface ProcurementRecord {
  slug: string;
  title: OfficialProcurementClaim<ProcurementLocalizedText>;
  stage: OfficialProcurementClaim<ProcurementLocalizedText>;
  description: OfficialProcurementClaim<ProcurementLocalizedText>;
  department: OfficialProcurementClaim<ProcurementLocalizedText>;
  districts: OfficialProcurementClaim<ProcurementLocalizedText[]>;
  contractor: OfficialProcurementClaim<ProcurementLocalizedText> | null;
  contract_value: OfficialProcurementClaim<ContractAmount> | null;
  tender_reference: OfficialProcurementClaim<ProcurementLocalizedText> | null;
}

export interface ProcurementFilters {
  stage: string;
  department: string;
  district: string;
  contractor: "all" | "named" | "undisclosed";
}

export interface ProcurementCatalogResponse {
  data: ProcurementRecord[];
  status: "prepared-empty" | "reviewed";
}

export const procurementStages = [
  {
    key: "notice",
    label: "Notice",
    description: "Public call inviting bids; not proof of an award.",
  },
  {
    key: "tender-estimate",
    label: "Tender Estimate",
    description: "Estimated value before evaluation or award.",
  },
  {
    key: "bid-evaluation",
    label: "Bid Evaluation",
    description: "Review of submitted bids; not a contract.",
  },
  {
    key: "contract-award",
    label: "Contract Award",
    description: "Supplier selected and award made; not a public outcome.",
  },
  {
    key: "contract-value",
    label: "Contract Value",
    description: "Agreed contract value with the selected supplier.",
  },
  {
    key: "physical-progress",
    label: "Physical Progress",
    description: "Work completion reported separately from contract value.",
  },
  {
    key: "public-outcome",
    label: "Public Outcome",
    description: "A measurable public result, distinct from contract value.",
  },
] as const;

// Production remains empty until every tender and contract observation completes source and bilingual review.
export const preparedProcurement: readonly ProcurementRecord[] = [];

export function localizedProcurementText(
  value: ProcurementLocalizedText,
  locale: Locale,
): string {
  return locale === "te" ? value.te : value.en;
}

export function formatContractValue(amount: ContractAmount): string {
  const formatted = amount.value.toLocaleString("en-IN");
  return amount.currency === "INR"
    ? `₹${formatted}`
    : `${formatted} ${amount.currency}`;
}

export function filterProcurement(
  records: ProcurementRecord[],
  filters: ProcurementFilters,
): ProcurementRecord[] {
  return records.filter((record) => {
    const hasContractor = record.contractor !== null;
    return (
      (!filters.stage || record.stage.value.en === filters.stage) &&
      (!filters.department ||
        record.department.value.en === filters.department) &&
      (!filters.district ||
        record.districts.value.some(
          (district) => district.en === filters.district,
        )) &&
      (filters.contractor === "all" ||
        (filters.contractor === "named" && hasContractor) ||
        (filters.contractor === "undisclosed" && !hasContractor))
    );
  });
}

export function preparedProcurementBySlug(
  slug: string,
): ProcurementRecord | null {
  return preparedProcurement.find((record) => record.slug === slug) ?? null;
}

export async function getProcurement(
  signal?: AbortSignal,
): Promise<ProcurementCatalogResponse> {
  const response = await fetch("/api/procurement", {
    headers: { Accept: "application/json" },
    signal,
  });
  if (!response.ok) {
    throw new Error(
      `Procurement request failed with status ${response.status}`,
    );
  }
  return (await response.json()) as ProcurementCatalogResponse;
}
