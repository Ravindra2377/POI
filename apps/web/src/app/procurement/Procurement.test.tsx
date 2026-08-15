import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LocaleProvider } from "@/components/LocaleProvider";
import {
  filterProcurement,
  formatContractValue,
  type ProcurementRecord,
  type ProcurementSourceRecord,
} from "@/lib/procurement";
import { ProcurementDetail } from "./ProcurementDetail";
import { ProcurementDirectory } from "./ProcurementDirectory";

const source: ProcurementSourceRecord = {
  source_record_id: "test-procurement-source-record",
  source_name: "Test Tender Portal",
  official_source_url: "https://example.gov.in/test-tenders",
  retrieval_date: "2026-08-15",
  review_status: "reviewed",
};

const claim = <T,>(value: T) => ({
  classification: "official" as const,
  value,
  source,
});

const testRecord: ProcurementRecord = {
  slug: "test-road-bridge-award",
  title: claim({
    en: "Test Road Bridge — Contract Award",
    te: "పరీక్ష రోడ్డు వంతెన — కాంట్రాక్టు అవార్డు",
  }),
  stage: claim({ en: "Contract Award", te: "కాంట్రాక్టు అవార్డు" }),
  description: claim({
    en: "A test-only contract award observation.",
    te: "పరీక్షల కోసం మాత్రమే కాంట్రాక్టు అవార్డు పరిశీలన.",
  }),
  department: claim({ en: "Roads Department", te: "రోడ్ల శాఖ" }),
  districts: claim([{ en: "Test District", te: "పరీక్ష జిల్లా" }]),
  contractor: claim({
    en: "Test Builders Pvt. Ltd.",
    te: "పరీక్ష బిల్డర్స్ ప్రైవేట్ లిమిటెడ్",
  }),
  contract_value: claim({ currency: "INR", value: 500000000 }),
  tender_reference: claim({ en: "NIT 2026/AP/123", te: "NIT 2026/AP/123" }),
};

const otherTestRecord: ProcurementRecord = {
  ...testRecord,
  slug: "test-road-bridge-notice",
  title: claim({
    en: "Test Road Bridge — Tender Notice",
    te: "పరీక్ష రోడ్డు వంతెన — టెండర్ నోటీస్",
  }),
  stage: claim({ en: "Notice", te: "నోటీస్" }),
  department: claim({ en: "Water Department", te: "జల శాఖ" }),
  contractor: null,
  contract_value: null,
  tender_reference: null,
};

function response(data: ProcurementRecord[]) {
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

describe("procurement filtering and formatting", () => {
  it("combines stage, department, district and contractor filters", () => {
    expect(
      filterProcurement([testRecord], {
        stage: "Contract Award",
        department: "Roads Department",
        district: "Test District",
        contractor: "named",
      }),
    ).toEqual([testRecord]);
    expect(
      filterProcurement([testRecord], {
        stage: "Contract Award",
        department: "Roads Department",
        district: "Another District",
        contractor: "named",
      }),
    ).toEqual([]);
    expect(
      filterProcurement([{ ...testRecord, contractor: null }], {
        stage: "",
        department: "",
        district: "",
        contractor: "undisclosed",
      }),
    ).toHaveLength(1);
  });

  it("formats contract values with Indian grouping", () => {
    expect(formatContractValue({ currency: "INR", value: 500000000 })).toBe(
      "₹50,00,00,000",
    );
  });
});

describe("ProcurementDirectory", () => {
  it("renders loading and explicitly prepared empty states", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response([])));
    render(
      <LocaleProvider>
        <ProcurementDirectory />
      </LocaleProvider>,
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      "Loading the reviewed procurement catalogue",
    );
    expect(
      await screen.findByRole("heading", {
        name: "No reviewed procurement records are published yet",
      }),
    ).toBeVisible();
    expect(
      screen.getByText(
        /not a claim that Andhra Pradesh publishes no procurement/,
      ),
    ).toBeVisible();
    expect(
      screen.getByRole("group", {
        name: "Filter reviewed procurement records",
      }),
    ).toBeVisible();
  });

  it("renders bilingual claims, contract values and all native filters", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response([testRecord])));
    const user = userEvent.setup();
    render(
      <LocaleProvider>
        <ProcurementDirectory />
      </LocaleProvider>,
    );

    expect(
      await screen.findByRole("heading", {
        name: "Test Road Bridge — Contract Award",
      }),
    ).toBeVisible();
    expect(screen.getAllByText("Official · Reviewed")).toHaveLength(8);
    expect(
      screen.getAllByRole("link", { name: "Test Tender Portal" }),
    ).toHaveLength(8);
    expect(screen.getByText("₹50,00,00,000")).toBeVisible();
    expect(screen.getByText("Test Builders Pvt. Ltd.")).toBeVisible();
    expect(screen.getByText("NIT 2026/AP/123")).toBeVisible();

    await user.selectOptions(screen.getByLabelText("Stage"), "Contract Award");
    await user.selectOptions(
      screen.getByLabelText("Department"),
      "Roads Department",
    );
    await user.selectOptions(
      screen.getByLabelText("District"),
      "Test District",
    );
    await user.selectOptions(screen.getByLabelText("Select language"), "te");
    expect(
      screen.getByRole("heading", {
        name: "పరీక్ష రోడ్డు వంతెన — కాంట్రాక్టు అవార్డు",
      }),
    ).toBeVisible();
    expect(screen.getByLabelText("దశ")).toHaveValue("Contract Award");
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
        <ProcurementDirectory />
      </LocaleProvider>,
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No contract value is being substituted",
    );
    await user.click(screen.getByRole("button", { name: "Retry" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    await screen.findByRole("heading", {
      name: "Test Road Bridge — Contract Award",
    });
    await user.selectOptions(screen.getByLabelText("Stage"), "Notice");
    await user.selectOptions(
      screen.getByLabelText("Department"),
      "Roads Department",
    );
    expect(
      screen.getByRole("heading", {
        name: "No reviewed procurement records match these filters",
      }),
    ).toBeVisible();
  });
});

describe("ProcurementDetail", () => {
  it("shows unavailable status without inventing a contract", () => {
    render(
      <LocaleProvider>
        <ProcurementDetail record={null} requestedSlug="not-reviewed" />
      </LocaleProvider>,
    );
    expect(
      screen.getByRole("heading", { name: "Procurement record unavailable" }),
    ).toBeVisible();
    expect(screen.getByText(/does not establish that a tender/)).toBeVisible();
  });

  it("places provenance beside every claim and renders unavailable fields", () => {
    render(
      <LocaleProvider>
        <ProcurementDetail
          record={otherTestRecord}
          requestedSlug={otherTestRecord.slug}
        />
      </LocaleProvider>,
    );
    expect(screen.getAllByText("Official · Reviewed")).toHaveLength(5);
    expect(
      screen.getAllByRole("link", { name: "Test Tender Portal" }),
    ).toHaveLength(5);
    expect(
      screen.getByText("Contractor not published in this reviewed record"),
    ).toBeVisible();
    expect(
      screen.getByText(
        "Contract value not published in this reviewed record. No demonstration figure is shown.",
      ),
    ).toBeVisible();
    expect(
      screen.getByText("Tender reference not stated in source"),
    ).toBeVisible();
  });
});
