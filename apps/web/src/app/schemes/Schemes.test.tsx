import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LocaleProvider } from "@/components/LocaleProvider";
import {
  filterSchemes,
  localized,
  type SchemeRecord,
  type SchemeSourceRecord,
} from "@/lib/schemes";
import { SchemeDetail } from "./SchemeDetail";
import { SchemesDirectory } from "./SchemesDirectory";

const source: SchemeSourceRecord = {
  source_record_id: "test-source-record",
  source_name: "Test Gazette Source",
  official_source_url: "https://example.gov.in/test-scheme",
  public_source_url: "https://example.gov.in/test-scheme",
  retrieval_date: "2026-08-14",
  review_status: "reviewed",
};

const testScheme: SchemeRecord = {
  slug: "test-health-support",
  jurisdiction: "IN-AP",
  name: {
    classification: "official",
    value: { en: "Test Health Support", te: "పరీక్ష ఆరోగ్య సహాయం" },
    source,
  },
  description: {
    classification: "official",
    value: {
      en: "A test-only description.",
      te: "పరీక్షల కోసం మాత్రమే వివరణ.",
    },
    source,
  },
  department: {
    classification: "official",
    value: { en: "Health Department", te: "ఆరోగ్య శాఖ" },
    source,
  },
  districts: {
    classification: "official",
    value: [{ en: "Test District", te: "పరీక్ష జిల్లా" }],
    source,
  },
  category: {
    classification: "official",
    value: { en: "Health", te: "ఆరోగ్యం" },
    source,
  },
  eligibility: {
    classification: "official",
    value: [{ en: "Test criterion", te: "పరీక్ష ప్రమాణం" }],
    source,
  },
};

function response(data: SchemeRecord[], teluguReviewed = false) {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      data,
      status: data.length ? "reviewed" : "prepared-empty",
      telugu_reviewed: teluguReviewed,
    }),
  };
}

afterEach(() => vi.unstubAllGlobals());

describe("scheme filtering", () => {
  it("combines department, district, category and eligibility filters", () => {
    expect(
      filterSchemes([testScheme], {
        department: "Health Department",
        district: "Test District",
        category: "Health",
        eligibility: "published",
      }),
    ).toEqual([testScheme]);
    expect(
      filterSchemes([testScheme], {
        department: "Health Department",
        district: "Another District",
        category: "Health",
        eligibility: "published",
      }),
    ).toEqual([]);
    expect(
      filterSchemes([{ ...testScheme, eligibility: null }], {
        department: "",
        district: "",
        category: "",
        eligibility: "unavailable",
      }),
    ).toHaveLength(1);
  });

  it("does not match unpublished department or district filters", () => {
    const partial = {
      ...testScheme,
      department: null,
      districts: null,
    };
    expect(
      filterSchemes([partial], {
        department: "",
        district: "",
        category: "",
        eligibility: "all",
      }),
    ).toHaveLength(1);
    expect(
      filterSchemes([partial], {
        department: "Health Department",
        district: "",
        category: "",
        eligibility: "all",
      }),
    ).toEqual([]);
    expect(
      filterSchemes([partial], {
        department: "",
        district: "Test District",
        category: "",
        eligibility: "all",
      }),
    ).toEqual([]);
  });

  it("falls back to English when a Telugu label is missing", () => {
    const te = "te";
    const partial = {
      ...testScheme,
      name: {
        ...testScheme.name,
        value: { en: "English Name", te: "" },
      },
    };
    expect(partial.name.value.en).toBe("English Name");
    expect(localized(partial.name.value, te)).toBe("English Name");
  });
});

describe("SchemesDirectory", () => {
  it("renders an honest loading state and prepared empty state", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response([])));

    render(
      <LocaleProvider>
        <SchemesDirectory />
      </LocaleProvider>,
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      "Loading the reviewed scheme catalogue",
    );
    expect(
      await screen.findByRole("heading", {
        name: "No reviewed scheme records are published yet",
      }),
    ).toBeVisible();
    expect(
      screen.getByText(/not a claim that .* has no schemes/),
    ).toBeVisible();
    expect(screen.getByLabelText("Department")).toHaveValue("");
    expect(screen.getByLabelText("District")).toHaveValue("");
    expect(screen.getByLabelText("Category")).toHaveValue("");
    expect(screen.getByLabelText("Eligibility information")).toHaveValue("all");
  });

  it("renders bilingual claims with visible provenance and filters natively", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response([testScheme])));
    const user = userEvent.setup();

    render(
      <LocaleProvider>
        <SchemesDirectory />
      </LocaleProvider>,
    );

    expect(
      await screen.findByRole("heading", { name: "Test Health Support" }),
    ).toBeVisible();
    expect(screen.getAllByText("Official · Reviewed")).toHaveLength(6);
    expect(
      screen.getAllByRole("link", { name: "Test Gazette Source" }),
    ).toHaveLength(6);
    expect(screen.getByLabelText("Department")).toHaveAccessibleName(
      "Department",
    );

    await user.selectOptions(
      screen.getByLabelText("District"),
      "Test District",
    );
    expect(
      screen.getByRole("heading", { name: "Test Health Support" }),
    ).toBeVisible();
    await user.selectOptions(
      screen.getByLabelText("Eligibility information"),
      "unavailable",
    );
    expect(
      screen.getByRole("heading", {
        name: "No reviewed schemes match these filters",
      }),
    ).toBeVisible();

    await user.selectOptions(screen.getByLabelText("Select language"), "te");
    expect(
      screen.getByRole("heading", {
        name: "ఈ ఫిల్టర్లకు సరిపోలే సమీక్షించిన పథకాలు లేవు",
      }),
    ).toBeVisible();
    expect(screen.getByLabelText("జిల్లా")).toHaveValue("Test District");
  });

  it("reports catalogue failures and retries without substitute data", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(response([]));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(
      <LocaleProvider>
        <SchemesDirectory />
      </LocaleProvider>,
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No scheme information is being substituted",
    );
    await user.click(screen.getByRole("button", { name: "Retry" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(
      await screen.findByText("No reviewed scheme records are published yet"),
    ).toBeVisible();
  });

  it("flags records whose Telugu labels are not yet reviewed", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(response([testScheme], false)),
    );

    render(
      <LocaleProvider>
        <SchemesDirectory />
      </LocaleProvider>,
    );

    expect(
      await screen.findByLabelText(
        /labels are not yet reviewed for these records/,
      ),
    ).toBeVisible();
  });

  it("renders unpublished department and district claims honestly", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        response([
          {
            ...testScheme,
            department: null,
            districts: null,
            eligibility: null,
          },
        ]),
      ),
    );

    render(
      <LocaleProvider>
        <SchemesDirectory />
      </LocaleProvider>,
    );

    expect(
      await screen.findByRole("heading", { name: "Test Health Support" }),
    ).toBeVisible();
    expect(
      screen.getAllByText("Not published in this reviewed record"),
    ).toHaveLength(3);
  });
});

describe("SchemeDetail", () => {
  it("shows unavailable status without implying that a scheme does not exist", () => {
    render(
      <LocaleProvider>
        <SchemeDetail scheme={null} requestedSlug="unknown-record" />
      </LocaleProvider>,
    );

    expect(
      screen.getByRole("heading", { name: "Scheme record unavailable" }),
    ).toBeVisible();
    expect(
      screen.getByText(/does not establish that a scheme exists/),
    ).toBeVisible();
    expect(screen.getByText(/unknown-record/)).toBeVisible();
  });

  it("places provenance beside every official detail claim", () => {
    render(
      <LocaleProvider>
        <SchemeDetail
          scheme={testScheme}
          requestedSlug={testScheme.slug}
          teluguReviewed={false}
        />
      </LocaleProvider>,
    );

    expect(screen.getAllByText("Official · Reviewed")).toHaveLength(6);
    expect(
      screen.getAllByRole("link", { name: "Test Gazette Source" }),
    ).toHaveLength(6);
    expect(screen.getByText("Test criterion")).toBeVisible();
  });

  it("shows a Telugu-unreviewed notice and unpublished claims honestly", () => {
    render(
      <LocaleProvider>
        <SchemeDetail
          scheme={{
            ...testScheme,
            department: null,
            districts: null,
            eligibility: null,
          }}
          requestedSlug={testScheme.slug}
          teluguReviewed={false}
        />
      </LocaleProvider>,
    );

    expect(
      screen.getByLabelText(
        "Telugu labels are not yet reviewed for this record; English values are shown.",
      ),
    ).toBeVisible();
    expect(
      screen.getAllByText("Not published in this reviewed record"),
    ).toHaveLength(2);
    expect(
      screen.getByText(
        "Eligibility criteria are unavailable in this reviewed record. This page cannot determine personal eligibility.",
      ),
    ).toBeVisible();
  });

  it("omits the Telugu notice once Telugu review is complete", () => {
    render(
      <LocaleProvider>
        <SchemeDetail
          scheme={testScheme}
          requestedSlug={testScheme.slug}
          teluguReviewed={true}
        />
      </LocaleProvider>,
    );

    expect(
      screen.queryByLabelText(/Telugu labels are not yet reviewed/),
    ).not.toBeInTheDocument();
  });
});
