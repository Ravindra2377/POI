import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import CivicActivityPage from "@/app/activity/page";
import CivicListsPage from "@/app/lists/page";

vi.mock("next/navigation", () => ({
  usePathname: () => "/lists",
}));

describe("Civic Letterboxd for Politics features", () => {
  it("renders an honest empty state for civic watchlists", () => {
    render(<CivicListsPage />);
    expect(
      screen.getByRole("heading", { name: "Civic Watchlists & Dossiers" }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", {
        name: "No reviewed civic watchlists are published yet",
      }),
    ).toBeVisible();
  });

  it("renders an honest empty state for civic activity", () => {
    render(<CivicActivityPage />);
    expect(
      screen.getByRole("heading", { name: "Civic Activity Stream" }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", {
        name: "No reviewed activity entries are published yet",
      }),
    ).toBeVisible();
  });
});
