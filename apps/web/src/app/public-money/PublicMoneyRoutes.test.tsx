import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/public-money/route";
import { LocaleProvider } from "@/components/LocaleProvider";
import PublicMoneyDetailPage from "./[slug]/page";
import PublicMoneyPage from "./page";

afterEach(() => vi.unstubAllGlobals());

describe("public-money routes", () => {
  it("serves only the explicitly labelled prepared-empty catalogue without fetching or casting", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      data: [],
      status: "prepared-empty",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("renders the public-money directory route", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: [], status: "prepared-empty" }),
      }),
    );
    render(
      <LocaleProvider>
        <PublicMoneyPage />
      </LocaleProvider>,
    );
    expect(
      screen.getByRole("heading", { level: 1, name: "AP Public Money" }),
    ).toBeVisible();
  });

  it("renders an honest unavailable dynamic route", async () => {
    const page = await PublicMoneyDetailPage({
      params: Promise.resolve({ slug: "not-reviewed" }),
    });
    render(<LocaleProvider>{page}</LocaleProvider>);
    expect(
      screen.getByRole("heading", { name: "Public-money record unavailable" }),
    ).toBeVisible();
    expect(
      screen.getByRole("link", { name: "← All public money" }),
    ).toHaveAttribute("href", "/public-money");
  });
});
