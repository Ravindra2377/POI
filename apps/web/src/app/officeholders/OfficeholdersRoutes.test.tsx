import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/officeholders/route";
import { LocaleProvider } from "@/components/LocaleProvider";
import OfficeholderDetailPage from "./[slug]/page";
import OfficeholdersPage from "./page";

afterEach(() => vi.unstubAllGlobals());

describe("officeholder routes", () => {
  it("serves only the explicitly labelled prepared-empty catalogue", async () => {
    const response = GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      data: [],
      status: "prepared-empty",
    });
  });

  it("renders the officeholder directory route", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: [], status: "prepared-empty" }),
      }),
    );
    render(
      <LocaleProvider>
        <OfficeholdersPage />
      </LocaleProvider>,
    );
    expect(
      screen.getByRole("heading", { level: 1, name: "AP Officeholders" }),
    ).toBeVisible();
  });

  it("renders an honest unavailable dynamic route", async () => {
    const page = await OfficeholderDetailPage({
      params: Promise.resolve({ slug: "not-reviewed" }),
    });
    render(<LocaleProvider>{page}</LocaleProvider>);
    expect(
      screen.getByRole("heading", { name: "Officeholder record unavailable" }),
    ).toBeVisible();
    expect(
      screen.getByRole("link", { name: "← All officeholders" }),
    ).toHaveAttribute("href", "/officeholders");
  });
});
