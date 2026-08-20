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
    vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (url.includes("/reports") && init?.method === "POST") {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            id: "44444444-4444-4444-4444-444444444444",
            user_id: "55555555-5555-5555-5555-555555555555",
            username: "anonymous_citizen",
            entity_type: "scheme",
            title_en: "Pending test observation",
            description_en: "Awaiting moderator review",
            classification: "community_reported",
            evidence_urls: [],
            status: "pending_review",
            created_at: new Date().toISOString(),
          }),
        });
      }
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

  it("keeps a newly submitted observation out of the public list", async () => {
    const user = userEvent.setup();
    render(
      <LocaleProvider>
        <CommunityContent />
      </LocaleProvider>,
    );

    await user.click(
      screen.getByRole("button", { name: "+ Log Field Observation" }),
    );
    await user.type(
      screen.getByPlaceholderText(
        "Observation Title (e.g. Delayed Mandal Disbursement)",
      ),
      "Pending test observation",
    );
    await user.type(
      screen.getByPlaceholderText(
        "Describe what you observed on the ground...",
      ),
      "Awaiting moderator review",
    );
    await user.click(
      screen.getByRole("button", { name: "Submit Observation" }),
    );

    expect(
      await screen.findByText(
        "Submitted for moderator review. It will not be public until approved.",
      ),
    ).toBeVisible();
    expect(
      screen.queryByText("Pending test observation"),
    ).not.toBeInTheDocument();
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
