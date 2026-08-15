import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LocaleProvider } from "@/components/LocaleProvider";
import MyAreaPage from "./page";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => "",
}));

afterEach(() => vi.unstubAllGlobals());

describe("my-area route", () => {
  it("renders the My Area route with the prepared area briefing", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [],
          meta: { page: 1, page_size: 100, total: 0, total_pages: 1 },
        }),
      }),
    );
    render(
      <LocaleProvider>
        <MyAreaPage />
      </LocaleProvider>,
    );
    expect(
      screen.getByRole("heading", { level: 1, name: "My Area" }),
    ).toBeVisible();
  });
});
