import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LocaleProvider } from "@/components/LocaleProvider";
import { GET } from "@/app/api/schemes/route";
import SchemeDetailPage from "./[slug]/page";
import SchemesPage from "./page";

afterEach(() => vi.unstubAllGlobals());

function preparedEmptyResponse() {
  return {
    ok: false,
    status: 503,
    json: async () => ({}),
  };
}

describe("scheme routes", () => {
  it("proxies the FastAPI catalogue with an honest prepared-empty fallback", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(preparedEmptyResponse()));
    const response = await GET(new Request("http://localhost/api/schemes"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      data: [],
      status: "prepared-empty",
      telugu_reviewed: false,
    });
  });

  it("passes through reviewed schemes when the catalogue is reachable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          data: [],
          status: "reviewed",
          telugu_reviewed: false,
        }),
      }),
    );
    const response = await GET(new Request("http://localhost/api/schemes"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      data: [],
      status: "reviewed",
      telugu_reviewed: false,
    });
  });

  it("renders the schemes directory route", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [],
          status: "prepared-empty",
          telugu_reviewed: false,
        }),
      }),
    );
    render(
      <LocaleProvider>
        <SchemesPage />
      </LocaleProvider>,
    );

    expect(
      screen.getByRole("heading", { level: 1, name: /Schemes/i }),
    ).toBeVisible();
    expect(
      screen.getByRole("group", { name: "Filter reviewed schemes" }),
    ).toBeVisible();
  });

  it("renders an honest unavailable dynamic route when no record is published", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(preparedEmptyResponse()));
    const page = await SchemeDetailPage({
      params: Promise.resolve({ slug: "not-reviewed" }),
      searchParams: Promise.resolve({}),
    });
    render(<LocaleProvider>{page}</LocaleProvider>);

    expect(
      screen.getByRole("heading", { name: "Scheme record unavailable" }),
    ).toBeVisible();
    expect(screen.getByRole("link", { name: /All.*schemes/i })).toHaveAttribute(
      "href",
      "/schemes?state=IN-AP",
    );
  });

  it("renders a published scheme record when the catalogue has it", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          data: [
            {
              slug: "ysrrb",
              name: {
                classification: "official",
                value: { en: "YSR Rythu Bharosa", te: "" },
                source: {
                  source_record_id: "scheme-source",
                  source_name: "myScheme Andhra Pradesh state scheme search",
                  official_source_url:
                    "https://api.myscheme.gov.in/search/v3/schemes?lang=en",
                  public_source_url:
                    "https://www.myscheme.gov.in/search/state/Andhra Pradesh",
                  retrieval_date: "2026-08-15",
                  review_status: "reviewed",
                },
              },
              description: {
                classification: "official",
                value: {
                  en: "Financial assistance for farmer families.",
                  te: "",
                },
                source: {
                  source_record_id: "scheme-source",
                  source_name: "myScheme Andhra Pradesh state scheme search",
                  official_source_url:
                    "https://api.myscheme.gov.in/search/v3/schemes?lang=en",
                  public_source_url:
                    "https://www.myscheme.gov.in/search/state/Andhra Pradesh",
                  retrieval_date: "2026-08-15",
                  review_status: "reviewed",
                },
              },
              category: {
                classification: "official",
                value: {
                  en: "Agriculture,Rural & Environment",
                  te: "",
                },
                source: {
                  source_record_id: "scheme-source",
                  source_name: "myScheme Andhra Pradesh state scheme search",
                  official_source_url:
                    "https://api.myscheme.gov.in/search/v3/schemes?lang=en",
                  public_source_url:
                    "https://www.myscheme.gov.in/search/state/Andhra Pradesh",
                  retrieval_date: "2026-08-15",
                  review_status: "reviewed",
                },
              },
              department: null,
              districts: null,
              eligibility: null,
            },
          ],
          status: "reviewed",
          telugu_reviewed: false,
        }),
      }),
    );
    const page = await SchemeDetailPage({
      params: Promise.resolve({ slug: "ysrrb" }),
      searchParams: Promise.resolve({}),
    });
    render(<LocaleProvider>{page}</LocaleProvider>);

    expect(
      screen.getByRole("heading", { name: "YSR Rythu Bharosa" }),
    ).toBeVisible();
    expect(
      screen.getAllByText("Not published in this reviewed record"),
    ).toHaveLength(2);
  });
});
