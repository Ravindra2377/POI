import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LocaleProvider } from "@/components/LocaleProvider";
import {
  filterOfficeholders,
  type OfficeholderRecord,
  type OfficeholderSourceRecord,
} from "@/lib/officeholders";
import { OfficeholderDetail } from "./OfficeholderDetail";
import { OfficeholdersDirectory } from "./OfficeholdersDirectory";

const source: OfficeholderSourceRecord = {
  source_record_id: "test-officeholder-source-record",
  source_name: "Test Gazette",
  official_source_url: "https://example.gov.in/test-gazette",
  retrieval_date: "2026-08-15",
  review_status: "reviewed",
};

const claim = <T,>(value: T) => ({
  classification: "official" as const,
  value,
  source,
});

const testRecord: OfficeholderRecord = {
  slug: "test-minister-of-water",
  title: claim({
    en: "Minister of Water — Term Record",
    te: "నీటిపారుదల మంత్రి — పదవీ కాల రికార్డు",
  }),
  holder: claim({ en: "Test Minister Name", te: "పరీక్ష మంత్రి పేరు" }),
  office: claim({ en: "Minister of Water", te: "నీటిపారుదల మంత్రి" }),
  body: claim({ en: "Water Department", te: "జల శాఖ" }),
  description: claim({
    en: "A test-only time-bounded term observation.",
    te: "పరీక్షల కోసం మాత్రమే కాలపరిమితి గల పదవీ కాల పరిశీలన.",
  }),
  districts: claim([{ en: "Test District", te: "పరీక్ష జిల్లా" }]),
  term_start: claim("2024-06-15"),
  term_end: claim("2025-09-01"),
};

const otherTestRecord: OfficeholderRecord = {
  ...testRecord,
  slug: "test-minister-of-roads",
  title: claim({
    en: "Minister of Roads — Continuing Term",
    te: "రోడ్ల మంత్రి — కొనసాగుతున్న పదవీ కాలం",
  }),
  holder: claim({ en: "Second Test Minister", te: "రెండవ పరీక్ష మంత్రి" }),
  office: claim({ en: "Minister of Roads", te: "రోడ్ల మంత్రి" }),
  body: claim({ en: "Roads Department", te: "రోడ్ల శాఖ" }),
  term_end: null,
};

function response(data: OfficeholderRecord[]) {
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

describe("officeholder filtering", () => {
  it("combines office, body, district and term-date filters", () => {
    expect(
      filterOfficeholders([testRecord], {
        office: "Minister of Water",
        body: "Water Department",
        district: "Test District",
        termDates: "published",
      }),
    ).toEqual([testRecord]);
    expect(
      filterOfficeholders([testRecord], {
        office: "Minister of Water",
        body: "Water Department",
        district: "Another District",
        termDates: "published",
      }),
    ).toEqual([]);
    expect(
      filterOfficeholders([{ ...testRecord, term_end: null }], {
        office: "",
        body: "",
        district: "",
        termDates: "unavailable",
      }),
    ).toHaveLength(1);
  });
});

describe("OfficeholdersDirectory", () => {
  it("renders loading and explicitly prepared empty states", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response([])));
    render(
      <LocaleProvider>
        <OfficeholdersDirectory />
      </LocaleProvider>,
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      "Loading the reviewed officeholder catalogue",
    );
    expect(
      await screen.findByRole("heading", {
        name: "No reviewed officeholder records are published yet",
      }),
    ).toBeVisible();
    expect(
      screen.getByText(/not a claim that Andhra Pradesh has no officeholders/),
    ).toBeVisible();
    expect(
      screen.getByRole("group", {
        name: "Filter reviewed officeholder records",
      }),
    ).toBeVisible();
  });

  it("renders bilingual claims, term dates and all native filters", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response([testRecord])));
    const user = userEvent.setup();
    render(
      <LocaleProvider>
        <OfficeholdersDirectory />
      </LocaleProvider>,
    );

    expect(
      await screen.findByRole("heading", {
        name: "Minister of Water — Term Record",
      }),
    ).toBeVisible();
    expect(screen.getAllByText("Official · Reviewed")).toHaveLength(8);
    expect(screen.getAllByRole("link", { name: "Test Gazette" })).toHaveLength(
      8,
    );
    expect(screen.getByText("2024-06-15")).toBeVisible();
    expect(screen.getByText("2025-09-01")).toBeVisible();

    await user.selectOptions(
      screen.getByLabelText("Office"),
      "Minister of Water",
    );
    await user.selectOptions(
      screen.getByLabelText("Government body"),
      "Water Department",
    );
    await user.selectOptions(
      screen.getByLabelText("District"),
      "Test District",
    );
    await user.selectOptions(screen.getByLabelText("Select language"), "te");
    expect(
      screen.getByRole("heading", {
        name: "నీటిపారుదల మంత్రి — పదవీ కాల రికార్డు",
      }),
    ).toBeVisible();
    expect(screen.getByLabelText("కార్యాలయం")).toHaveValue("Minister of Water");
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
        <OfficeholdersDirectory />
      </LocaleProvider>,
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No term detail is being substituted",
    );
    await user.click(screen.getByRole("button", { name: "Retry" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    await screen.findByRole("heading", {
      name: "Minister of Water — Term Record",
    });
    await user.selectOptions(
      screen.getByLabelText("Office"),
      "Minister of Roads",
    );
    await user.selectOptions(
      screen.getByLabelText("Government body"),
      "Water Department",
    );
    expect(
      screen.getByRole("heading", {
        name: "No reviewed officeholder records match these filters",
      }),
    ).toBeVisible();
  });
});

describe("OfficeholderDetail", () => {
  it("shows unavailable status without inventing a person or term", () => {
    render(
      <LocaleProvider>
        <OfficeholderDetail record={null} requestedSlug="not-reviewed" />
      </LocaleProvider>,
    );
    expect(
      screen.getByRole("heading", { name: "Officeholder record unavailable" }),
    ).toBeVisible();
    expect(screen.getByText(/does not establish that a person/)).toBeVisible();
  });

  it("places provenance beside every claim and renders unavailable term ends", () => {
    render(
      <LocaleProvider>
        <OfficeholderDetail
          record={otherTestRecord}
          requestedSlug={otherTestRecord.slug}
        />
      </LocaleProvider>,
    );
    expect(screen.getAllByText("Official · Reviewed")).toHaveLength(7);
    expect(screen.getAllByRole("link", { name: "Test Gazette" })).toHaveLength(
      7,
    );
    expect(screen.getByText("Term end not stated in source")).toBeVisible();
  });
});
