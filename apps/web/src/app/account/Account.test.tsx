import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { LocaleProvider } from "@/components/LocaleProvider";
import { AccountContent } from "./AccountContent";

vi.mock("next/navigation", () => ({
  usePathname: () => "/account",
}));

describe("AccountContent", () => {
  it("renders zero-tracking anonymous citizen profile", () => {
    render(
      <LocaleProvider>
        <AccountContent />
      </LocaleProvider>,
    );

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Zero-Tracking Citizen Participation",
      }),
    ).toBeVisible();

    expect(
      screen.getByRole("heading", {
        name: "Your Pseudonymous Profile",
      }),
    ).toBeVisible();

    expect(
      screen.getByText("Allow anonymous data aggregation for civic insights"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Save Anonymous Profile" }),
    ).toBeInTheDocument();
  });

  it("allows updating anonymous handle and saving preferences", async () => {
    const user = userEvent.setup();
    render(
      <LocaleProvider>
        <AccountContent />
      </LocaleProvider>,
    );

    const input = screen.getByLabelText("Pseudonymous Handle / Citizen ID");
    await user.clear(input);
    await user.type(input, "Ravindra Citizen");

    await user.click(
      screen.getByRole("button", { name: "Save Anonymous Profile" }),
    );

    expect(
      await screen.findByText(/Anonymous profile settings saved locally!/),
    ).toBeVisible();
  });

  it("switches anonymous account copy to Telugu", async () => {
    const user = userEvent.setup();
    render(
      <LocaleProvider>
        <AccountContent />
      </LocaleProvider>,
    );

    await user.selectOptions(screen.getByLabelText("Select language"), "te");

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "జీరో-ట్రాకింగ్ పౌర భాగస్వామ్యం",
      }),
    ).toBeVisible();
  });
});
