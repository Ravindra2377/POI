import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LocaleProvider } from "@/components/LocaleProvider";
import type { ClaimRecordComparison } from "@/lib/comparisons";
import { VerificationDirectory } from "./VerificationDirectory";

const comparison: ClaimRecordComparison = {
  id: "comparison-1",
  comparison_kind: "budget_estimate_vs_actuals",
  entity_type: "budget_line",
  entity_id: "entity-0202",
  entity_label: { en: "Education, Sports, Art and Culture", te: "" },
  verdict: "divergent",
  classification: "calculated",
  claim: {
    observation_id: "obs-claim",
    label: { en: "Budget estimate", te: "" },
    value: { en: "1,21,92,01,000", te: "" },
    source_name: "Annual Financial Statement 2022-23",
    official_source_url: "https://apfinance.gov.in/afs-2022-23.pdf",
    public_source_url: "https://apfinance.gov.in/budget.html",
    review_status: "reviewed",
  },
  record: {
    observation_id: "obs-record",
    label: { en: "Accounts (actuals)", te: "" },
    value: { en: "89,57,00,000", te: "" },
    source_name: "Annual Financial Statement 2022-23",
    official_source_url: "https://apfinance.gov.in/afs-2022-23.pdf",
    public_source_url: "https://apfinance.gov.in/budget.html",
    review_status: "reviewed",
  },
  difference: -3235001000,
  difference_percent: -26.53,
  tolerance_percent: 5,
  method: {
    en: "Budget estimate claimed for the fiscal year compared against the accounts column.",
    te: "",
  },
  reviewer_identity: "verification-operator",
  decided_at: "2026-08-17T08:00:00Z",
  created_at: "2026-08-17T08:00:00Z",
};

function jsonResponse<T>(value: T): Response {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function renderDirectory() {
  render(
    <LocaleProvider>
      <VerificationDirectory />
    </LocaleProvider>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("VerificationDirectory", () => {
  it("renders reviewed comparisons with claim, record and verdict", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          jsonResponse({ data: [comparison], status: "reviewed" }),
        ),
      ),
    );

    renderDirectory();

    expect(
      await screen.findByText("Education, Sports, Art and Culture"),
    ).toBeInTheDocument();
    expect(screen.getByText("Divergent")).toBeInTheDocument();
    expect(screen.getByText("Budget estimate")).toBeInTheDocument();
    expect(screen.getByText("Accounts (actuals)")).toBeInTheDocument();
    expect(
      screen.getAllByText(/Annual Financial Statement 2022-23/).length,
    ).toBeGreaterThan(0);
  });

  it("shows an honest empty state when no comparisons are published", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(jsonResponse({ data: [], status: "prepared-empty" })),
      ),
    );

    renderDirectory();

    expect(
      await screen.findByText("No reviewed comparisons are published yet"),
    ).toBeInTheDocument();
  });

  it("shows an error state when the catalogue is unavailable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(new Error("network down"))),
    );

    renderDirectory();

    expect(
      await screen.findByText("Comparisons could not be loaded"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });
});
