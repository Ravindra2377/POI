import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import CivicActivityPage from "@/app/activity/page";
import CivicListsPage from "@/app/lists/page";

vi.mock("next/navigation", () => ({
  usePathname: () => "/lists",
}));

describe("development tracking experience", () => {
  it("renders an honest device-private development watchlist", async () => {
    render(<CivicListsPage />);
    expect(
      await screen.findByRole("heading", {
        name: "Your development watchlist",
      }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "Your watchlist is empty" }),
    ).toBeVisible();
    expect(screen.getByText(/interests to the server/i)).toBeVisible();
  });

  it("renders an honest device-private civic diary", async () => {
    render(<CivicActivityPage />);
    expect(
      await screen.findByRole("heading", { name: "Your civic diary" }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "No local diary activity yet" }),
    ).toBeVisible();
    expect(screen.getByText(/not a public activity feed/i)).toBeVisible();
  });
});
