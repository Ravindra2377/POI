import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/procurement/route";
import { LocaleProvider } from "@/components/LocaleProvider";
import ProcurementDetailPage from "./[slug]/page";
import ProcurementPage from "./page";

afterEach(() => vi.unstubAllGlobals());

describe("procurement routes", () => {
  it("serves only the explicitly labelled prepared-empty catalogue", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      data: [],
      status: "prepared-empty",
    });
  });

  it("renders the procurement directory route", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: [], status: "prepared-empty" }),
      }),
    );
    render(
      <LocaleProvider>
        <ProcurementPage />
      </LocaleProvider>,
    );
    expect(
      screen.getByRole("heading", { level: 1, name: "AP Procurement" }),
    ).toBeVisible();
  });

  it("renders an honest unavailable dynamic route", async () => {
    const page = await ProcurementDetailPage({
      params: Promise.resolve({ slug: "not-reviewed" }),
    });
    render(<LocaleProvider>{page}</LocaleProvider>);
    expect(
      screen.getByRole("heading", { name: "Procurement record unavailable" }),
    ).toBeVisible();
    expect(
      screen.getByRole("link", { name: "← All procurement" }),
    ).toHaveAttribute("href", "/procurement");
  });
});
