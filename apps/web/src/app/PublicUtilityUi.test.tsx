import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FinancialStageSelector } from "@/components/FinancialStageSelector";
import { LocaleProvider } from "@/components/LocaleProvider";
import { SiteHeader } from "@/components/SiteHeader";
import { UniversalRecordSearch } from "@/components/UniversalRecordSearch";
import { GovernmentDirectory } from "@/app/government/GovernmentDirectory";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ push }),
}));

function page(data: unknown[]) {
  return {
    ok: true,
    json: async () => ({
      data,
      meta: {
        page: 1,
        page_size: 100,
        total: data.length,
        total_pages: data.length ? 1 : 0,
      },
    }),
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  push.mockReset();
});

describe("public utility interface", () => {
  it("exposes semantic global navigation and a keyboard-operable language control", async () => {
    const user = userEvent.setup();
    render(
      <LocaleProvider>
        <SiteHeader />
      </LocaleProvider>,
    );

    expect(
      screen.getByRole("navigation", { name: "Primary navigation" }),
    ).toBeVisible();
    expect(screen.getByRole("link", { name: "Explore Data" })).toHaveAttribute(
      "href",
      "/explore-data",
    );
    expect(
      screen.getByText(
        "Andhra Pradesh is the first state live. National structure is ready.",
      ),
    ).toBeVisible();

    const telugu = screen.getByRole("button", { name: "తెలుగు" });
    await user.click(telugu);
    expect(telugu).toHaveAttribute("aria-pressed", "true");
    expect(document.documentElement).toHaveAttribute("lang", "te");
  });

  it("submits the current supported search contract with state and sector selection", async () => {
    const user = userEvent.setup();
    render(<UniversalRecordSearch />);

    await user.type(
      screen.getByLabelText("Search government records"),
      "Vizag",
    );
    await user.selectOptions(screen.getByLabelText("Sector"), "Health");
    await user.click(screen.getByRole("button", { name: "Search records" }));

    expect(push).toHaveBeenCalledWith(
      expect.stringContaining("/explore-data?"),
    );
    expect(push.mock.calls[0][0]).toContain("q=Vizag");
    expect(push.mock.calls[0][0]).toContain("state=Andhra+Pradesh");
    expect(push.mock.calls[0][0]).toContain("sector=Health");
    expect(screen.getByText(/Current live search covers/)).toBeVisible();
  });

  it("keeps all public-money stages separate and states the unavailable-data boundary", async () => {
    const user = userEvent.setup();
    render(<FinancialStageSelector />);

    expect(screen.getAllByRole("button")).toHaveLength(11);
    await user.click(screen.getByRole("button", { name: /Contract Award/ }));
    expect(
      screen.getByRole("heading", { name: "Contract Award" }),
    ).toBeVisible();
    expect(screen.getByText(/not a public outcome/)).toBeVisible();
    expect(
      screen.getByText("No reviewed finance records published"),
    ).toBeVisible();
  });

  it("renders an honest minister empty state when Stage 1 returns no officeholders", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(page([])));
    render(<GovernmentDirectory />);

    expect(
      await screen.findByText(
        "Reviewed officeholder records are not yet published",
      ),
    ).toBeVisible();
    expect(
      screen.getByText(
        /No Union minister, state minister or representative is hard-coded/,
      ),
    ).toBeVisible();
  });
});
