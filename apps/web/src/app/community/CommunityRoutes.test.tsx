import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/community/route";
import { LocaleProvider } from "@/components/LocaleProvider";
import CommunityPage from "./page";

vi.mock("next/navigation", () => ({
  usePathname: () => "/community",
}));

describe("community routes", () => {
  it("serves community participation API response", async () => {
    const response = GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toHaveProperty("data");
  });

  it("renders the Community route as an anonymous civic pulse hub", () => {
    render(
      <LocaleProvider>
        <CommunityPage />
      </LocaleProvider>,
    );
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Anonymous Field Reality & Citizen Observations",
      }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", {
        name: "Civic Pulse Polls",
      }),
    ).toBeVisible();
  });
});
