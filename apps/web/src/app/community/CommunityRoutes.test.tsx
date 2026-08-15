import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/community/route";
import { LocaleProvider } from "@/components/LocaleProvider";
import CommunityPage from "./page";

vi.mock("next/navigation", () => ({
  usePathname: () => "",
}));

describe("community routes", () => {
  it("serves only the explicitly labelled prepared-closed participation API", async () => {
    const response = GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      data: [],
      status: "prepared-closed",
    });
  });

  it("renders the Community route as a closed, prepared shell", () => {
    render(
      <LocaleProvider>
        <CommunityPage />
      </LocaleProvider>,
    );
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Public experience, clearly separate from official fact.",
      }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", {
        name: "No poll result here represents India or Andhra Pradesh",
      }),
    ).toBeVisible();
  });
});
