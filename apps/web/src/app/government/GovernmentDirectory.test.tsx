import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GovernmentDirectory } from "./GovernmentDirectory";
import type {
  GovernmentBodyRecord,
  PageResponse,
  ProvenanceSummary,
  PublicOfficeRecord,
  RepresentativeRecord,
} from "@/lib/catalog-types";

const provenance: ProvenanceSummary = {
  source_id: "test-representative-source",
  source_name: "AP Legislative Assembly member report (Term XVI)",
  official_source_url: "https://aplegislature.org",
  retrieval_date: "2026-08-17",
  publication_date: null,
  effective_date: null,
  review_status: "reviewed",
  is_fixture: false,
};

const bodies: GovernmentBodyRecord[] = [
  {
    id: "body-assembly",
    slug: "andhra-pradesh-legislative-assembly",
    body_type: "legislature",
    name_en: "Andhra Pradesh Legislative Assembly",
    name_te: null,
    official_code: null,
    parent_id: null,
    valid_from: "2024-06-06",
    valid_to: null,
    is_active: true,
    aliases: [],
    sector: "Legislature",
    provenance,
  },
];

const offices: PublicOfficeRecord[] = [
  {
    id: "office-ichchapuram",
    slug: "mla-ichchapuram",
    name_en: "Member of Legislative Assembly, ICHCHAPURAM",
    name_te: null,
    office_type: "mla_assembly_constituency",
    official_code: null,
    government_body_id: "body-assembly",
    valid_from: "2024-06-06",
    valid_to: null,
    is_active: true,
    has_point: false,
    provenance,
  },
];

const representatives: RepresentativeRecord[] = [
  {
    id: "rep-bendalam",
    slug: "term16-3107-ichchapuram",
    name_en: "SRI ASHOK BENDALAM",
    name_te: null,
    valid_from: "2024-06-06",
    valid_to: null,
    is_active: true,
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

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("GovernmentDirectory", () => {
  it("renders reviewed bodies, offices and representatives from the catalog", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/api/v1/representatives"))
          return Promise.resolve(jsonResponse(page(representatives)));
        if (url.includes("/api/v1/public-offices"))
          return Promise.resolve(jsonResponse(page(offices)));
        return Promise.resolve(jsonResponse(page(bodies)));
      }),
    );

    render(<GovernmentDirectory />);

    expect(
      await screen.findByText("Andhra Pradesh Legislative Assembly"),
    ).toBeInTheDocument();
    expect(
      await screen.findByText("Member of Legislative Assembly, ICHCHAPURAM"),
    ).toBeInTheDocument();
    expect(await screen.findByText("SRI ASHOK BENDALAM")).toBeInTheDocument();
    expect(screen.getAllByText(/reviewed/i).length).toBeGreaterThan(0);
  });

  it("shows honest empty states when the catalog has no officeholder records", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/api/v1/representatives"))
          return Promise.resolve(jsonResponse(page<RepresentativeRecord>([])));
        if (url.includes("/api/v1/public-offices"))
          return Promise.resolve(jsonResponse(page<PublicOfficeRecord>([])));
        return Promise.resolve(jsonResponse(page<GovernmentBodyRecord>([])));
      }),
    );

    render(<GovernmentDirectory />);

    expect(
      await screen.findByText(
        "Reviewed officeholder records are not yet published",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Reviewed public-office records are not yet published"),
    ).toBeInTheDocument();
  });
});
