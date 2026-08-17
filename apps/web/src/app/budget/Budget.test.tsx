import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LocaleProvider } from "@/components/LocaleProvider";
import {
  filterBudget,
  formatRupees,
  type BudgetLine,
  type BudgetSourceRecord,
} from "@/lib/budget";
import { BudgetDetail } from "./BudgetDetail";
import { BudgetDirectory } from "./BudgetDirectory";

const source: BudgetSourceRecord = {
  source_record_id: "test-budget-source-record",
  source_name: "Annual Financial Statement (Test)",
  official_source_url: "https://apfinance.gov.in/budget.html",
  public_source_url: "https://apfinance.gov.in/budget.html",
  retrieval_date: "2026-08-16",
  review_status: "reviewed",
};

const claim = <T,>(value: T) => ({
  classification: "official" as const,
  value,
  source,
});

const testLine: BudgetLine = {
  slug: "2022-23-revenue_receipts-0202-education-sports-art-and-culture",
  fiscal_year: "2022-23",
  statement: "revenue_receipts",
  code: "0202",
  name: claim({
    en: "Education, Sports, Art and Culture",
    te: "విద్య, క్రీడలు, కళ మరియు సంస్కృతి",
  }),
  unit: "Thousands",
  amounts: [
    { label: "accounts", value_text: "84,46,72", rupees: "8446720000.00" },
    { label: "revised", value_text: "87,00,00", rupees: 8700000000 },
    { label: "budget", value_text: "89,57,00", rupees: 8957000000 },
  ],
  budget_estimate: claim({ en: "89,57,00", te: "89,57,00" }),
  source,
};

const otherLine: BudgetLine = {
  ...testLine,
  slug: "2023-24-capital_expenditure-4059-capital-outlay-on-water-supply-and-sanitation",
  fiscal_year: "2023-24",
  statement: "capital_expenditure",
  code: "4059",
  name: claim({
    en: "Capital Outlay on Water Supply and Sanitation",
    te: "నీటి సరఫరా మరియు పారిశుధ్యంపై మూలధన వ్యయం",
  }),
  unit: "Lakhs",
  amounts: [{ label: "budget", value_text: "12,34,56", rupees: 1234560000 }],
  budget_estimate: claim({ en: "12,34,56", te: "12,34,56" }),
};

function response(data: BudgetLine[]) {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      data,
      status: data.length ? "reviewed" : "prepared-empty",
    }),
  };
}

afterEach(() => vi.unstubAllGlobals());

describe("budget line filtering", () => {
  it("combines statement, fiscal-year and unit filters", () => {
    expect(
      filterBudget([testLine, otherLine], {
        statement: "revenue_receipts",
        fiscalYear: "2022-23",
        unit: "Thousands",
      }),
    ).toEqual([testLine]);
    expect(
      filterBudget([testLine, otherLine], {
        statement: "capital_expenditure",
        fiscalYear: "2022-23",
        unit: "",
      }),
    ).toEqual([]);
    expect(
      filterBudget([testLine, otherLine], {
        statement: "",
        fiscalYear: "2023-24",
        unit: "Lakhs",
      }),
    ).toEqual([otherLine]);
  });

  it("formats token strings and numbers to whole rupees", () => {
    expect(formatRupees("8446720000.00")).toBe("8,44,67,20,000");
    expect(formatRupees(1234560000)).toBe("1,23,45,60,000");
    expect(formatRupees("89,57,00")).toBe("89,57,00");
  });
});

describe("BudgetDirectory", () => {
  it("renders loading and explicitly prepared empty states", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response([])));
    render(
      <LocaleProvider>
        <BudgetDirectory />
      </LocaleProvider>,
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      "Loading the reviewed budget catalogue…",
    );
    expect(
      await screen.findByRole("heading", {
        name: "No reviewed budget lines are published yet",
      }),
    ).toBeVisible();
    expect(
      screen.getByText(/not a claim that Andhra Pradesh has no budget lines/),
    ).toBeVisible();
    expect(
      screen.getByRole("group", {
        name: "Filter reviewed budget lines",
      }),
    ).toBeVisible();
  });

  it("renders bilingual claims, statement labels and all native filters", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response([testLine])));
    const user = userEvent.setup();
    render(
      <LocaleProvider>
        <BudgetDirectory />
      </LocaleProvider>,
    );

    expect(
      await screen.findByRole("heading", {
        name: "Education, Sports, Art and Culture",
      }),
    ).toBeVisible();
    expect(screen.getAllByText("Official · Reviewed")).toHaveLength(4);
    expect(
      screen.getAllByRole("link", {
        name: "Annual Financial Statement (Test)",
      }),
    ).toHaveLength(4);
    expect(screen.getByText("Revenue Receipts · 2022-23")).toBeVisible();
    expect(screen.getAllByText("Thousands").length).toBeGreaterThanOrEqual(3);

    await user.selectOptions(
      screen.getByLabelText("Statement"),
      "revenue_receipts",
    );
    await user.selectOptions(screen.getByLabelText("Fiscal year"), "2022-23");
    await user.selectOptions(screen.getByLabelText("Unit"), "Thousands");
    await user.selectOptions(screen.getByLabelText("Select language"), "te");
    expect(
      screen.getByRole("heading", {
        name: "విద్య, క్రీడలు, కళ మరియు సంస్కృతి",
      }),
    ).toBeVisible();
    expect(
      screen.getAllByText(/రెవెన్యూ రశీదులు/).length,
    ).toBeGreaterThanOrEqual(2);
    expect(screen.getByLabelText("ప్రకటన")).toHaveValue("revenue_receipts");
  });

  it("reports failures, retries, then shows filtered-empty honestly", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(response([testLine, otherLine]));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(
      <LocaleProvider>
        <BudgetDirectory />
      </LocaleProvider>,
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No budget figure is being substituted",
    );
    await user.click(screen.getByRole("button", { name: "Retry" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    await screen.findByRole("heading", {
      name: "Education, Sports, Art and Culture",
    });
    await user.selectOptions(
      screen.getByLabelText("Statement"),
      "revenue_receipts",
    );
    await user.selectOptions(screen.getByLabelText("Fiscal year"), "2023-24");
    expect(
      screen.getByRole("heading", {
        name: "No reviewed budget lines match these filters",
      }),
    ).toBeVisible();
  });
});

describe("BudgetDetail", () => {
  it("shows unavailable status without inventing a figure", () => {
    render(
      <LocaleProvider>
        <BudgetDetail line={null} requestedSlug="not-reviewed" />
      </LocaleProvider>,
    );
    expect(
      screen.getByRole("heading", { name: "Budget line record unavailable" }),
    ).toBeVisible();
    expect(
      screen.getByText(/does not establish that a major head/),
    ).toBeVisible();
  });

  it("places provenance beside every claim and renders the amount columns", () => {
    render(
      <LocaleProvider>
        <BudgetDetail line={testLine} requestedSlug={testLine.slug} />
      </LocaleProvider>,
    );
    expect(screen.getAllByText("Official · Reviewed")).toHaveLength(7);
    expect(
      screen.getAllByRole("link", {
        name: "Annual Financial Statement (Test)",
      }),
    ).toHaveLength(7);
    expect(screen.getByText("89,57,00")).toBeVisible();
    expect(screen.getByText("84,46,72")).toBeVisible();
    expect(screen.getByText("8,44,67,20,000")).toBeVisible();
    expect(screen.getByText("accounts")).toBeVisible();
    expect(screen.getByText("budget")).toBeVisible();
  });
});
