import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/election-results/route";
import { LocaleProvider } from "@/components/LocaleProvider";
import ElectionResultDetailPage from "./[slug]/page";
import ElectionResultsPage from "./page";

afterEach(() => vi.unstubAllGlobals());

describe("election results routes", () => {
  it("serves only the explicitly labelled prepared-empty catalogue", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      data: [],
      status: "prepared-empty",
    });
  });

  it("renders the election results directory route", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: [], status: "prepared-empty" }),
      }),
    );
    render(
      <LocaleProvider>
        <ElectionResultsPage />
      </LocaleProvider>,
    );
    expect(
      screen.getByRole("heading", { level: 1, name: "AP Election Results" }),
    ).toBeVisible();
  });

  it("renders an honest unavailable dynamic route", async () => {
    const page = await ElectionResultDetailPage({
      params: Promise.resolve({ slug: "not-reviewed" }),
    });
    render(<LocaleProvider>{page}</LocaleProvider>);
    expect(
      screen.getByRole("heading", {
        name: "Election result record unavailable",
      }),
    ).toBeVisible();
    expect(
      screen.getByRole("link", { name: "← All election results" }),
    ).toHaveAttribute("href", "/election-results");
  });
});
