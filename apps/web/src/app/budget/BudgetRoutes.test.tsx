import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/budget/route";
import { LocaleProvider } from "@/components/LocaleProvider";
import BudgetDetailPage from "./[slug]/page";
import BudgetPage from "./page";

afterEach(() => vi.unstubAllGlobals());

describe("budget routes", () => {
  it("serves only the explicitly labelled prepared-empty catalogue", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      data: [],
      status: "prepared-empty",
    });
  });

  it("renders the budget directory route", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: [], status: "prepared-empty" }),
      }),
    );
    render(
      <LocaleProvider>
        <BudgetPage />
      </LocaleProvider>,
    );
    expect(
      screen.getByRole("heading", { level: 1, name: /Budget/i }),
    ).toBeVisible();
  });

  it("renders an honest unavailable dynamic route", async () => {
    const page = await BudgetDetailPage({
      params: Promise.resolve({ slug: "not-reviewed" }),
    });
    render(<LocaleProvider>{page}</LocaleProvider>);
    expect(
      screen.getByRole("heading", { name: "Budget line record unavailable" }),
    ).toBeVisible();
    expect(
      screen.getByRole("link", { name: "← All budget lines" }),
    ).toHaveAttribute("href", "/budget");
  });
});
