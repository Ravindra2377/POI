import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LocaleProvider } from "@/components/LocaleProvider";
import AccountPage from "./page";

vi.mock("next/navigation", () => ({
  usePathname: () => "",
}));

describe("account route", () => {
  it("renders the Account route as a prepared, honest shell", () => {
    render(
      <LocaleProvider>
        <AccountPage />
      </LocaleProvider>,
    );
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Your account is not open yet",
      }),
    ).toBeVisible();
    expect(
      screen.getByText(
        /There is no sign-up, no sign-in, and no saved preference/,
      ),
    ).toBeVisible();
  });
});
