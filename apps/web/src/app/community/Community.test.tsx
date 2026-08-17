import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LocaleProvider } from "@/components/LocaleProvider";
import { CommunityContent } from "./CommunityContent";

vi.mock("next/navigation", () => ({
  usePathname: () => "/community",
}));

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation((url: string) => {
      if (url.includes("/polls")) {
        return Promise.resolve({
          ok: true,
          json: async () => [
            {
              id: "11111111-1111-1111-1111-111111111111",
              title_en: "Rythu Bharosa Disbursement Experience",
              description_en: "Have you received assistance?",
              options: [
                {
                  id: "opt_full",
                  label_en: "Yes, full amount received",
                  vote_count: 42,
                },
              ],
              total_votes: 42,
              is_active: true,
              non_representative_disclaimer:
                "Non-representative Community Pulse — Opinions recorded here",
              created_at: new Date().toISOString(),
            },
          ],
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => [],
      });
    }),
  );
});

afterEach(() => vi.unstubAllGlobals());

describe("CommunityContent", () => {
  it("renders interactive Civic Pulse polls and Rule #5 legal disclaimer", async () => {
    render(
      <LocaleProvider>
        <CommunityContent />
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

    const disclaimer = await screen.findByText(
      /Non-representative Community Pulse/,
    );
    expect(disclaimer).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: "+ Log Field Observation" }),
    ).toBeInTheDocument();
  });

  it("opens modal for logging citizen field observations", async () => {
    const user = userEvent.setup();
    render(
      <LocaleProvider>
        <CommunityContent />
      </LocaleProvider>,
    );

    await user.click(
      screen.getByRole("button", { name: "+ Log Field Observation" }),
    );

    expect(
      screen.getByRole("heading", {
        name: "Log a Citizen Field Observation",
      }),
    ).toBeVisible();

    expect(
      screen.getByRole("button", { name: "Submit Observation" }),
    ).toBeInTheDocument();
  });

  it("switches community copy to Telugu", async () => {
    const user = userEvent.setup();
    render(
      <LocaleProvider>
        <CommunityContent />
      </LocaleProvider>,
    );

    await user.selectOptions(screen.getByLabelText("Select language"), "te");

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "అనామక క్షేత్ర వాస్తవికత & పౌరుల పరిశీలనలు",
      }),
    ).toBeVisible();
  });
});
