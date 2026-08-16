import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LocaleProvider } from "@/components/LocaleProvider";
import type {
  ElectionResultRecord,
  ElectionResultSourceRecord,
} from "@/lib/election-results";
import {
  buildShareText,
  buildWhatsAppShareUrl,
  constituencyPageUrl,
  latestTermId,
  resultDistricts,
  seatBySlug,
  seatsForDistrict,
  seatStatusWord,
} from "@/lib/know-your-constituency";
import { KnowYourConstituency } from "./KnowYourConstituency";

const { params, replace } = vi.hoisted(() => {
  const params = new URLSearchParams();
  const replace = vi.fn((url: string) => {
    params.delete("district");
    params.delete("seat");
    const query = url.split("?")[1];
    if (query) {
      for (const [key, value] of new URLSearchParams(query)) {
        params.set(key, value);
      }
    }
  });
  return { params, replace };
});

vi.mock("next/navigation", () => ({
  useSearchParams: () => params,
  useRouter: () => ({ replace }),
  usePathname: () => "",
}));

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

const ichchapuram: ElectionResultRecord = {
  slug: "term16-1-ichchapuram",
  term_id: 16,
  member_sl_no: "1",
  constituency_no: "1",
  reserved_category: "",
  member_name: claim({ en: "Sri Ashok Bendalam", te: "శ్రీ అశోక్ బెందాలం" }),
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

const srikakulam: ElectionResultRecord = {
  ...ichchapuram,
  slug: "term16-2-srikakulam",
  member_sl_no: "2",
  constituency_no: "2",
  member_name: claim({ en: "Sri Gundu Sudharani", te: "శ్రీ గుండు సుధారాణి" }),
  constituency: claim({ en: "Srikakulam", te: "శ్రీకాకుళం" }),
  seat_status: claim("died"),
};

const kovur: ElectionResultRecord = {
  ...ichchapuram,
  slug: "term16-kovur",
  term_id: 16,
  member_sl_no: "11",
  constituency_no: "",
  member_name: claim({ en: "Sri P. Jagadeesh", te: "శ్రీ పి. జగదీశ్" }),
  constituency: claim({ en: "Kovur", te: "కొవ్వూరు" }),
  district: claim({ en: "NELLORE", te: "నెల్లూరు" }),
  party: claim({ en: "YSRCP", te: "వైఎస్ఆర్సీపీ" }),
};

const term14Record: ElectionResultRecord = {
  ...ichchapuram,
  slug: "term14-202-nandigama-sc-bye-election",
  term_id: 14,
  member_sl_no: "15A",
  constituency_no: "202",
  reserved_category: "SC",
  member_name: claim({ en: "Tangirala Soumya", te: "తంగిరాల సౌమ్య" }),
  constituency: claim({ en: "Nandigama (SC)", te: "నందిగామ (SC)" }),
  district: claim({ en: "KRISHNA", te: "కృష్ణా" }),
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

afterEach(() => {
  vi.unstubAllGlobals();
  replace.mockClear();
  params.delete("district");
  params.delete("seat");
});

describe("constituency helpers", () => {
  it("finds the latest term across records", () => {
    expect(latestTermId([term14Record, ichchapuram])).toBe(16);
    expect(latestTermId([])).toBe(0);
  });

  it("groups the latest term's districts, sorted and bilingual", () => {
    expect(
      resultDistricts([term14Record, ichchapuram, srikakulam, kovur], 16),
    ).toEqual([
      { en: "NELLORE", te: "నెల్లూరు" },
      { en: "SRIKAKULAM", te: "శ్రీకాకుళం" },
    ]);
  });

  it("orders a district's seats by constituency number then slug", () => {
    const seats = seatsForDistrict(
      [kovur, srikakulam, ichchapuram],
      16,
      "SRIKAKULAM",
    );
    expect(seats.map((seat) => seat.slug)).toEqual([
      "term16-1-ichchapuram",
      "term16-2-srikakulam",
    ]);
    expect(seatBySlug(seats, "term16-2-srikakulam")).toBe(srikakulam);
    expect(seatBySlug(seats, "nope")).toBeNull();
  });

  it("maps seat status to bilingual words and defaults to no change", () => {
    expect(seatStatusWord("died", "en")).toBe("Died");
    expect(seatStatusWord("bye_election", "te")).toBe("ఉప ఎన్నిక");
    expect(seatStatusWord("", "en")).toBe("No change recorded");
  });

  it("builds a deep-linkable constituency URL", () => {
    expect(
      constituencyPageUrl(
        "https://ap.example",
        "SRIKAKULAM",
        "term16-1-ichchapuram",
      ),
    ).toBe(
      "https://ap.example/know-your-constituency?district=SRIKAKULAM&seat=term16-1-ichchapuram",
    );
  });

  it("builds bilingual share text that names the source and deep link", () => {
    const url =
      "https://ap.example/know-your-constituency?district=SRIKAKULAM&seat=term16-1-ichchapuram";
    const en = buildShareText(ichchapuram, "en", url);
    expect(en).toContain("Sri Ashok Bendalam");
    expect(en).toContain("(TDP)");
    expect(en).toContain("Ichchapuram");
    expect(en).toContain("Test Legislature Report");
    expect(en).toContain(url);
    const te = buildShareText(ichchapuram, "te", url);
    expect(te).toContain("శ్రీ అశోక్ బెందాలం");
    expect(te).toContain("ఇచ్చాపురం");
    expect(te).toContain("Test Legislature Report");
  });

  it("encodes share text into a WhatsApp deep link", () => {
    const url = buildWhatsAppShareUrl("Your MLA in Ichchapuram is X");
    expect(url).toBe(
      "https://wa.me/?text=Your%20MLA%20in%20Ichchapuram%20is%20X",
    );
  });
});

describe("KnowYourConstituency", () => {
  it("renders the privacy notice and an honest prepared-empty state", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response([])));
    render(
      <LocaleProvider>
        <KnowYourConstituency />
      </LocaleProvider>,
    );

    expect(
      await screen.findByRole("heading", { name: "Know Your Constituency" }),
    ).toBeVisible();
    expect(screen.getByText("Coarse geography only")).toBeVisible();
    expect(
      screen.getByText(/No precise location, coordinates or device location/),
    ).toBeVisible();
    expect(
      await screen.findByRole("heading", {
        name: "No reviewed constituency records are published yet",
      }),
    ).toBeVisible();
    expect(
      screen.getByText(
        /not a claim that Andhra Pradesh has no elected members/,
      ),
    ).toBeVisible();
  });

  it("links the honest community submit flow from the launch page", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response([])));
    render(
      <LocaleProvider>
        <KnowYourConstituency />
      </LocaleProvider>,
    );

    await screen.findByRole("heading", { name: "Know Your Constituency" });
    expect(
      screen.getByRole("heading", { name: "Your constituency, by you" }),
    ).toBeVisible();
    expect(screen.getByText(/planned, not open/i)).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Read the community charter" }),
    ).toHaveAttribute("href", "/community");
  });

  it("picks a district, lists its current-term seats, and shows the profile card", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(response([term14Record, ichchapuram, kovur])),
    );
    const user = userEvent.setup();
    const { rerender } = render(
      <LocaleProvider>
        <KnowYourConstituency />
      </LocaleProvider>,
    );
    await screen.findByRole("heading", { name: "Know Your Constituency" });
    await screen.findByRole("option", { name: "SRIKAKULAM" });

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Your district" }),
      "SRIKAKULAM",
    );
    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith(
        expect.stringContaining("district=SRIKAKULAM"),
      ),
    );
    rerender(
      <LocaleProvider>
        <KnowYourConstituency />
      </LocaleProvider>,
    );

    expect(
      screen.getByRole("heading", { name: "Seats in SRIKAKULAM" }),
    ).toBeVisible();
    expect(screen.getByText("Sri Ashok Bendalam")).toBeVisible();
    expect(screen.queryByText("Tangirala Soumya")).not.toBeInTheDocument();
    expect(screen.queryByText("Kovur")).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("button", {
        name: /View the record for Ichchapuram/,
      }),
    );
    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith(
        expect.stringContaining("seat=term16-1-ichchapuram"),
      ),
    );
    rerender(
      <LocaleProvider>
        <KnowYourConstituency />
      </LocaleProvider>,
    );

    expect(
      screen.getByRole("heading", { name: "Your constituency record" }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "Sri Ashok Bendalam" }),
    ).toBeVisible();
    expect(screen.getByText("No change recorded")).toBeVisible();
    expect(
      screen.getAllByText("Test Legislature Report").length,
    ).toBeGreaterThanOrEqual(2);
    const whatsapp = screen.getByRole("link", { name: "Share on WhatsApp" });
    expect(whatsapp).toHaveAttribute("href", expect.stringContaining("wa.me"));
    expect(whatsapp).toHaveAttribute(
      "href",
      expect.stringContaining("Sri%20Ashok"),
    );
  });

  it("deep-links straight to a seat profile and supports copy-link", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response([ichchapuram])));
    params.set("district", "SRIKAKULAM");
    params.set("seat", "term16-1-ichchapuram");
    render(
      <LocaleProvider>
        <KnowYourConstituency />
      </LocaleProvider>,
    );

    expect(
      await screen.findByRole("heading", { name: "Sri Ashok Bendalam" }),
    ).toBeVisible();
    expect(screen.getByText("General election")).toBeVisible();
    expect(screen.getAllByText("TDP").length).toBeGreaterThanOrEqual(1);
    const copyButton = screen.getByRole("button", { name: "Copy link" });
    expect(copyButton).toBeVisible();
  });

  it("reports failures and retries", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(response([ichchapuram]));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(
      <LocaleProvider>
        <KnowYourConstituency />
      </LocaleProvider>,
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No record is being substituted",
    );
    await user.click(screen.getByRole("button", { name: "Retry" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    await screen.findByRole("combobox", { name: "Your district" });
  });

  it("switches the whole page to Telugu", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response([ichchapuram])));
    const user = userEvent.setup();
    render(
      <LocaleProvider>
        <KnowYourConstituency />
      </LocaleProvider>,
    );
    await screen.findByRole("heading", { name: "Know Your Constituency" });
    await user.selectOptions(screen.getByLabelText("Select language"), "te");

    expect(
      screen.getByRole("heading", { name: "మీ నియోజకవర్గాన్ని తెలుసుకోండి" }),
    ).toBeVisible();
    expect(screen.getByLabelText("మీ జిల్లా")).toBeVisible();
    expect(
      screen.getByRole("option", { name: "శ్రీకాకుళం" }),
    ).toBeInTheDocument();
  });
});
