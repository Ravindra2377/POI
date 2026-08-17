import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LocaleProvider } from "@/components/LocaleProvider";
import AccountPage from "./page";

vi.mock("next/navigation", () => ({
  usePathname: () => "/account",
}));

describe("account route", () => {
  it("renders the Account route as zero-tracking anonymous profile", () => {
    render(
      <LocaleProvider>
        <AccountPage />
      </LocaleProvider>,
    );
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Zero-Tracking Citizen Participation",
      }),
    ).toBeVisible();
    expect(
      screen.getByText(/No login, no passwords, and no personal data stored/),
    ).toBeVisible();
  });
});
