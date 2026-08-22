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
        name: "My files",
      }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "No files followed yet" }),
    ).toBeVisible();
    expect(screen.getByText(/interests to the server/i)).toBeVisible();
  });

  it("renders an honest device-private activity history", async () => {
    render(<CivicActivityPage />);
    expect(
      await screen.findByRole("heading", { name: "Your activity" }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "No local activity yet" }),
    ).toBeVisible();
    expect(screen.getByText(/not a public feed/i)).toBeVisible();
  });
});
