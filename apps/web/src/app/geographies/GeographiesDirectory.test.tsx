import { render, screen, fireEvent } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GeographiesDirectory } from "./GeographiesDirectory";
import type {
  GeographyRecord,
  PageResponse,
  ProvenanceSummary,
} from "@/lib/catalog-types";

const provenance: ProvenanceSummary = {
  source_id: "test-lgd-ap",
  source_name: "LGD district list — Andhra Pradesh",
  official_source_url: "https://lgdirectory.gov.in",
  retrieval_date: "2026-08-17",
  publication_date: null,
  effective_date: null,
  review_status: "reviewed",
  is_fixture: false,
};

const apDistricts: GeographyRecord[] = [
  {
    id: "geo-anantapur",
    slug: "in-ap-anantapur",
    entity_type: "district",
    name_en: "Anantapur",
    name_te: "అనంతపురం",
    official_code: "502",
    official_code_scheme: "LGD district code",
    parent_id: "state-in-ap",
    valid_from: "2026-08-17",
    valid_to: null,
    is_active: true,
    is_pilot: false,
    aliases: [],
    has_point: false,
    has_boundary: false,
    coverage_note:
      "Boundary not reviewed; the native-language label is the local rendering reported by the LGD district-list feed.",
    provenance,
  },
  {
    id: "geo-visakhapatnam",
    slug: "in-ap-visakhapatnam",
    entity_type: "district",
    name_en: "Visakhapatnam",
    name_te: "విశాఖపట్నం",
    official_code: "520",
    official_code_scheme: "LGD district code",
    parent_id: "state-in-ap",
    valid_from: "2026-08-17",
    valid_to: null,
    is_active: true,
    is_pilot: false,
    aliases: [],
    has_point: false,
    has_boundary: false,
    coverage_note: null,
    provenance,
  },
  {
    id: "geo-guntur",
    slug: "in-ap-guntur",
    entity_type: "district",
    name_en: "Guntur",
    name_te: "గుంటూరు",
    official_code: "506",
    official_code_scheme: "LGD district code",
    parent_id: "state-in-ap",
    valid_from: "2026-08-17",
    valid_to: null,
    is_active: true,
    is_pilot: false,
    aliases: [],
    has_point: false,
    has_boundary: false,
    coverage_note: null,
    provenance,
  },
];

const tgDistricts: GeographyRecord[] = [
  {
    id: "geo-hyderabad",
    slug: "in-tg-hyderabad",
    entity_type: "district",
    name_en: "Hyderabad",
    name_te: "హైదరాబాద్",
    official_code: "507",
    official_code_scheme: "LGD district code",
    parent_id: "state-in-tg",
    valid_from: "2026-08-17",
    valid_to: null,
    is_active: true,
    is_pilot: false,
    aliases: [],
    has_point: false,
    has_boundary: false,
    coverage_note: null,
    provenance,
  },
];

function page<T>(data: T[]): PageResponse<T> {
  return {
    data,
    meta: { page: 1, page_size: 100, total: data.length, total_pages: 1 },
  };
}

function jsonResponse<T>(value: T): Response {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function stubCatalog(
  responder: (url: string) => PageResponse<GeographyRecord>,
) {
  vi.stubGlobal(
    "fetch",
    vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (!url.includes("/api/v1/geographies"))
        return Promise.resolve(jsonResponse({ data: [], meta: null }));
      return Promise.resolve(jsonResponse(responder(url)));
    }),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("GeographiesDirectory", () => {
  it("renders header and reviewed Andhra Pradesh districts from the catalog", async () => {
    stubCatalog((url) => {
      if (url.includes("parent=in-ap")) return page(apDistricts);
      return page([]);
    });

    render(<GeographiesDirectory />);

    expect(
      screen.getByText("Districts & Administrative Divisions Explorer"),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("heading", { name: /Anantapur/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /Visakhapatnam/i }),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/reviewed/i).length).toBeGreaterThan(0);
  });

  it("loads a different state's districts after switching the dropdown", async () => {
    stubCatalog((url) => {
      if (url.includes("parent=in-tg")) return page(tgDistricts);
      return page(apDistricts);
    });

    render(<GeographiesDirectory />);
    await screen.findByRole("heading", { name: /Anantapur/i });

    const select = screen.getByLabelText(/SELECT STATE \/ UNION TERRITORY/i);
    fireEvent.change(select, { target: { value: "IN-TG" } });

    expect(
      await screen.findByRole("heading", { name: /Hyderabad/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: /Anantapur/i }),
    ).not.toBeInTheDocument();
  });

  it("filters districts by search term", async () => {
    stubCatalog((url) => {
      if (url.includes("q=Guntur")) {
        return page(apDistricts.filter((d) => d.name_en === "Guntur"));
      }
      return page(apDistricts);
    });

    render(<GeographiesDirectory />);
    await screen.findByRole("heading", { name: /Visakhapatnam/i });

    const searchInput = screen.getByPlaceholderText(
      /Search Andhra Pradesh districts/i,
    );
    fireEvent.change(searchInput, { target: { value: "Guntur" } });

    expect(
      await screen.findByRole("heading", { name: /Guntur/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: /Visakhapatnam/i }),
    ).not.toBeInTheDocument();
  });

  it("shows an honest empty state when no districts are published for a state", async () => {
    stubCatalog(() => page([]));

    render(<GeographiesDirectory />);

    expect(
      await screen.findByText(
        /No reviewed districts published for Andhra Pradesh/i,
      ),
    ).toBeInTheDocument();
  });

  it("shows an error state when the catalog API is unavailable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(new Error("network down"))),
    );

    render(<GeographiesDirectory />);

    expect(
      await screen.findByText(/Records could not be loaded/i),
    ).toBeInTheDocument();
  });
});
