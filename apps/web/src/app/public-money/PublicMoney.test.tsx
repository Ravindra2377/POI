import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LocaleProvider } from "@/components/LocaleProvider";
import {
  filterPublicMoney,
  formatMoneyAmount,
  type MoneySourceRecord,
  type PublicMoneyRecord,
} from "@/lib/public-money";
import { PublicMoneyDetail } from "./PublicMoneyDetail";
import { PublicMoneyDirectory } from "./PublicMoneyDirectory";

const source: MoneySourceRecord = {
  source_record_id: "test-money-source-record",
  source_name: "Test Finance Register",
  official_source_url: "https://example.gov.in/test-finance",
  retrieval_date: "2026-08-15",
  review_status: "reviewed",
};

const claim = <T,>(value: T) => ({
  classification: "official" as const,
  value,
  source,
});

const testRecord: PublicMoneyRecord = {
  slug: "test-funds-released",
  title: claim({
    en: "Test Water Project — Funds Released",
    te: "పరీక్ష నీటి ప్రాజెక్టు — విడుదలైన నిధులు",
  }),
  stage: claim({ en: "Funds Released", te: "విడుదలైన నిధులు" }),
  description: claim({
    en: "A test-only funds-released observation.",
    te: "పరీక్షల కోసం మాత్రమే విడుదలైన నిధుల పరిశీలన.",
  }),
  department: claim({ en: "Water Department", te: "జల శాఖ" }),
  districts: claim([{ en: "Test District", te: "పరీక్ష జిల్లా" }]),
  reporting_period: claim({ en: "2025-26 · Q3", te: "2025-26 · Q3" }),
  amount: claim({ currency: "INR", value: 12345678 }),
};

const otherTestRecord: PublicMoneyRecord = {
  ...testRecord,
  slug: "test-contract-award",
  title: claim({ en: "Test Contract Award", te: "పరీక్ష కాంట్రాక్టు" }),
  stage: claim({ en: "Contract Award", te: "కాంట్రాక్టు అవార్డు" }),
  department: claim({ en: "Roads Department", te: "రోడ్ల శాఖ" }),
  reporting_period: null,
  amount: null,
};

function response(data: PublicMoneyRecord[]) {
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

describe("public-money filtering and formatting", () => {
  it("combines stage, department, district and amount filters", () => {
    expect(
      filterPublicMoney([testRecord], {
        stage: "Funds Released",
        department: "Water Department",
        district: "Test District",
        amount: "published",
      }),
    ).toEqual([testRecord]);
    expect(
      filterPublicMoney([testRecord], {
        stage: "Funds Released",
        department: "Water Department",
        district: "Another District",
        amount: "published",
      }),
    ).toEqual([]);
    expect(
      filterPublicMoney([{ ...testRecord, amount: null }], {
        stage: "",
        department: "",
        district: "",
        amount: "unavailable",
      }),
    ).toHaveLength(1);
  });

  it("formats official amounts with Indian grouping", () => {
    expect(formatMoneyAmount({ currency: "INR", value: 12345678 })).toBe(
      "₹1,23,45,678",
    );
  });
});

describe("PublicMoneyDirectory", () => {
  it("renders loading and explicitly prepared empty states", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response([])));
    render(
      <LocaleProvider>
        <PublicMoneyDirectory />
      </LocaleProvider>,
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      "Loading the reviewed public-money catalogue",
    );
    expect(
      await screen.findByRole("heading", {
        name: "No reviewed public-money records are published yet",
      }),
    ).toBeVisible();
    expect(
      screen.getByText(
        /not a claim that Andhra Pradesh has no public-money records/,
      ),
    ).toBeVisible();
    expect(
      screen.getByRole("group", {
        name: "Filter reviewed public-money records",
      }),
    ).toBeVisible();
  });

  it("renders bilingual claims, amounts and all native filters", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response([testRecord])));
    const user = userEvent.setup();
    render(
      <LocaleProvider>
        <PublicMoneyDirectory />
      </LocaleProvider>,
    );

    expect(
      await screen.findByRole("heading", {
        name: "Test Water Project — Funds Released",
      }),
    ).toBeVisible();
    expect(screen.getAllByText("Official · Reviewed")).toHaveLength(7);
    expect(
      screen.getAllByRole("link", { name: "Test Finance Register" }),
    ).toHaveLength(7);
    expect(screen.getByText("₹1,23,45,678")).toBeVisible();
    expect(screen.getByText("2025-26 · Q3")).toBeVisible();

    await user.selectOptions(screen.getByLabelText("Stage"), "Funds Released");
    await user.selectOptions(
      screen.getByLabelText("Department"),
      "Water Department",
    );
    await user.selectOptions(
      screen.getByLabelText("District"),
      "Test District",
    );
    await user.selectOptions(screen.getByLabelText("Select language"), "te");
    expect(
      screen.getByRole("heading", {
        name: "పరీక్ష నీటి ప్రాజెక్టు — విడుదలైన నిధులు",
      }),
    ).toBeVisible();
    expect(screen.getByLabelText("దశ")).toHaveValue("Funds Released");
  });

  it("reports failures, retries, then shows filtered-empty honestly", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(response([testRecord, otherTestRecord]));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(
      <LocaleProvider>
        <PublicMoneyDirectory />
      </LocaleProvider>,
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No financial figure is being substituted",
    );
    await user.click(screen.getByRole("button", { name: "Retry" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    await screen.findByRole("heading", {
      name: "Test Water Project — Funds Released",
    });
    await user.selectOptions(screen.getByLabelText("Stage"), "Funds Released");
    await user.selectOptions(
      screen.getByLabelText("Department"),
      "Roads Department",
    );
    expect(
      screen.getByRole("heading", {
        name: "No reviewed public-money records match these filters",
      }),
    ).toBeVisible();
  });
});

describe("PublicMoneyDetail", () => {
  it("shows unavailable status without inventing a figure", () => {
    render(
      <LocaleProvider>
        <PublicMoneyDetail record={null} requestedSlug="not-reviewed" />
      </LocaleProvider>,
    );
    expect(
      screen.getByRole("heading", { name: "Public-money record unavailable" }),
    ).toBeVisible();
    expect(screen.getByText(/does not establish that a figure/)).toBeVisible();
  });

  it("places provenance beside every claim and renders unavailable fields", () => {
    render(
      <LocaleProvider>
        <PublicMoneyDetail
          record={otherTestRecord}
          requestedSlug={otherTestRecord.slug}
        />
      </LocaleProvider>,
    );
    expect(screen.getAllByText("Official · Reviewed")).toHaveLength(5);
    expect(
      screen.getAllByRole("link", { name: "Test Finance Register" }),
    ).toHaveLength(5);
    expect(screen.getByText(/No demonstration figure is shown/)).toBeVisible();
    expect(
      screen.getByText("Reporting period not stated in source"),
    ).toBeVisible();
  });
});
