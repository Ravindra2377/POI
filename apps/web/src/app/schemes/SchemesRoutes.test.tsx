import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LocaleProvider } from "@/components/LocaleProvider";
import { GET } from "@/app/api/schemes/route";
import SchemeDetailPage from "./[slug]/page";
import SchemesPage from "./page";

afterEach(() => vi.unstubAllGlobals());

describe("scheme routes", () => {
  it("serves only the explicitly labelled prepared-empty catalogue", async () => {
    const response = GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      data: [],
      status: "prepared-empty",
    });
  });

  it("renders the schemes directory route", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: [], status: "prepared-empty" }),
      }),
    );
    render(
      <LocaleProvider>
        <SchemesPage />
      </LocaleProvider>,
    );

    expect(
      screen.getByRole("heading", { level: 1, name: "AP Schemes" }),
    ).toBeVisible();
    expect(
      screen.getByRole("group", { name: "Filter reviewed schemes" }),
    ).toBeVisible();
  });

  it("renders an honest unavailable dynamic route", async () => {
    const page = await SchemeDetailPage({
      params: Promise.resolve({ slug: "not-reviewed" }),
    });
    render(<LocaleProvider>{page}</LocaleProvider>);

    expect(
      screen.getByRole("heading", { name: "Scheme record unavailable" }),
    ).toBeVisible();
    expect(
      screen.getByRole("link", { name: "← All AP schemes" }),
    ).toHaveAttribute("href", "/schemes");
  });
});
