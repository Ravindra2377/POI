import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LocaleProvider } from "@/components/LocaleProvider";
import {
  filterElectionResults,
  type ElectionResultRecord,
  type ElectionResultSourceRecord,
} from "@/lib/election-results";
import { ElectionResultsDetail } from "./ElectionResultsDetail";
import { ElectionResultsDirectory } from "./ElectionResultsDirectory";

const source: ElectionResultSourceRecord = {
  source_record_id: "test-election-result-source-record",
  source_name: "Test Legislature Report",
  official_source_url: "https://example.gov.in/test-report",
  retrieval_date: "2026-08-16",
  review_status: "reviewed",
};

const claim = <T,>(value: T) => ({
  classification: "official" as const,
  value,
  source,
});

const testRecord: ElectionResultRecord = {
  slug: "term16-1-ichchapuram",
  term_id: 16,
  member_sl_no: "1",
  constituency_no: "1",
  reserved_category: "",
  member_name: claim({
    en: "Sri Ashok Bendalam",
    te: "శ్రీ అశోక్ బెందాలం",
  }),
  constituency: claim({ en: "Ichchapuram", te: "ఇచ్చాపురం" }),
  district: claim({ en: "SRIKAKULAM", te: "శ్రీకాకుళం" }),
  party: claim({ en: "TDP", te: "TDP" }),
  term_period: claim({
    en: "Term XVI (constituted 06.06.2024)",
    te: "పదహారవ పదవీ కాలం",
  }),
  elected_via: claim("general_election"),
  seat_status: claim(""),
  annotation: null,
};

const byeElectionRecord: ElectionResultRecord = {
  ...testRecord,
  slug: "term14-202-nandigama-sc-bye-election",
  term_id: 14,
  member_sl_no: "15A",
  constituency_no: "202",
  reserved_category: "SC",
  member_name: claim({ en: "Tangirala Soumya", te: "తంగిరాల సౌమ్య" }),
  constituency: claim({ en: "Nandigama (SC)", te: "నందిగామ (SC)" }),
  district: claim({ en: "KRISHNA", te: "కృష్ణా" }),
  party: claim({ en: "TDP", te: "TDP" }),
  term_period: claim({
    en: "Term XIV (constituted 2014)",
    te: "పద్నాలుగవ పదవీ కాలం",
  }),
  elected_via: claim("bye_election"),
  seat_status: claim("bye_election"),
  annotation: claim({
    en: "Bye-Election held and Oath on 16.11.2014",
    te: "ఉప ఎన్నిక జరిగి ప్రమాణం 16.11.2014న",
  }),
};

function response(data: ElectionResultRecord[]) {
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

describe("election result filtering", () => {
  it("combines district, party, term and seat-status filters", () => {
    expect(
      filterElectionResults([testRecord], {
        district: "SRIKAKULAM",
        party: "TDP",
        term: "16",
        seatStatus: "",
      }),
    ).toEqual([testRecord]);
    expect(
      filterElectionResults([testRecord], {
        district: "KRISHNA",
        party: "",
        term: "",
        seatStatus: "",
      }),
    ).toEqual([]);
    expect(
      filterElectionResults([byeElectionRecord], {
        district: "",
        party: "",
        term: "14",
        seatStatus: "bye_election",
      }),
    ).toEqual([byeElectionRecord]);
  });
});

describe("ElectionResultsDirectory", () => {
  it("renders loading and explicitly prepared empty states", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response([])));
    render(
      <LocaleProvider>
        <ElectionResultsDirectory />
      </LocaleProvider>,
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      "Loading the reviewed election results catalogue",
    );
    expect(
      await screen.findByRole("heading", {
        name: "No reviewed election results are published yet",
      }),
    ).toBeVisible();
    expect(
      screen.getByText(
        /not a claim that Andhra Pradesh has no election results/,
      ),
    ).toBeVisible();
    expect(
      screen.getByRole("group", {
        name: "Filter reviewed election results",
      }),
    ).toBeVisible();
  });

  it("renders bilingual claims, seat status and all native filters", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response([testRecord])));
    const user = userEvent.setup();
    render(
      <LocaleProvider>
        <ElectionResultsDirectory />
      </LocaleProvider>,
    );

    expect(
      await screen.findByRole("heading", {
        name: "Sri Ashok Bendalam",
      }),
    ).toBeVisible();
    expect(screen.getAllByText("Official · Reviewed")).toHaveLength(8);
    expect(
      screen.getAllByRole("link", { name: "Test Legislature Report" }),
    ).toHaveLength(8);
    expect(screen.getAllByText("SRIKAKULAM").length).toBeGreaterThanOrEqual(2);
    expect(
      screen.getAllByText("General election").length,
    ).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("No change recorded")).toBeVisible();

    await user.selectOptions(screen.getByLabelText("District"), "SRIKAKULAM");
    await user.selectOptions(screen.getByLabelText("Party"), "TDP");
    await user.selectOptions(screen.getByLabelText("Term"), "16");
    await user.selectOptions(screen.getByLabelText("Seat status"), "");
    await user.selectOptions(screen.getByLabelText("Select language"), "te");
    expect(
      screen.getByRole("heading", { name: "శ్రీ అశోక్ బెందాలం" }),
    ).toBeVisible();
    expect(screen.getByLabelText("జిల్లా")).toHaveValue("SRIKAKULAM");
  });

  it("reports failures, retries, then shows filtered-empty honestly", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(response([testRecord, byeElectionRecord]));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(
      <LocaleProvider>
        <ElectionResultsDirectory />
      </LocaleProvider>,
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No result is being substituted",
    );
    await user.click(screen.getByRole("button", { name: "Retry" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    await screen.findByRole("heading", { name: "Sri Ashok Bendalam" });
    await user.selectOptions(
      screen.getByLabelText("Seat status"),
      "bye_election",
    );
    expect(
      screen.getByRole("heading", {
        name: "Tangirala Soumya",
      }),
    ).toBeVisible();
    await user.selectOptions(screen.getByLabelText("District"), "SRIKAKULAM");
    expect(
      screen.getByRole("heading", {
        name: "No reviewed election results match these filters",
      }),
    ).toBeVisible();
  });
});

describe("ElectionResultsDetail", () => {
  it("shows unavailable status without inventing a result", () => {
    render(
      <LocaleProvider>
        <ElectionResultsDetail record={null} requestedSlug="not-reviewed" />
      </LocaleProvider>,
    );
    expect(
      screen.getByRole("heading", {
        name: "Election result record unavailable",
      }),
    ).toBeVisible();
    expect(screen.getByText(/does not establish that a winner/)).toBeVisible();
  });

  it("places provenance beside every claim and renders annotations", () => {
    render(
      <LocaleProvider>
        <ElectionResultsDetail
          record={byeElectionRecord}
          requestedSlug={byeElectionRecord.slug}
        />
      </LocaleProvider>,
    );
    expect(screen.getAllByText("Official · Reviewed")).toHaveLength(12);
    expect(
      screen.getAllByRole("link", { name: "Test Legislature Report" }),
    ).toHaveLength(12);
    expect(screen.getAllByText("By-election")).toHaveLength(2);
    expect(
      screen.getByText("Bye-Election held and Oath on 16.11.2014"),
    ).toBeVisible();
  });
});
