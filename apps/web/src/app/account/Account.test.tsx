import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LocaleProvider } from "@/components/LocaleProvider";
import { AccountContent } from "./AccountContent";

vi.mock("next/navigation", () => ({
  usePathname: () => "/account",
}));

let submissionsEnabled = true;

beforeEach(() => {
  submissionsEnabled = true;
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation((url: string) =>
      Promise.resolve({
        ok: true,
        json: async () =>
          url.includes("/participation-status")
            ? {
                submissions_enabled: submissionsEnabled,
                mode: submissionsEnabled ? "open" : "read_only",
              }
            : {},
      }),
    ),
  );
});

afterEach(() => vi.unstubAllGlobals());

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
    await vi.waitFor(() => expect(input).toBeEnabled());
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

  it("disables profile writes during the read-only public data beta", async () => {
    submissionsEnabled = false;
    render(
      <LocaleProvider>
        <AccountContent />
      </LocaleProvider>,
    );

    expect(
      await screen.findByText("Profile changes are temporarily disabled"),
    ).toBeVisible();
    expect(
      screen.getByLabelText("Pseudonymous Handle / Citizen ID"),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Save Anonymous Profile" }),
    ).toBeDisabled();

    const fetchMock = vi.mocked(fetch);
    expect(
      fetchMock.mock.calls.some(([, init]) => init?.method === "POST"),
    ).toBe(false);
  });
});
