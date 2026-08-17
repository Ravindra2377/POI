import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CivicPosterCard } from "@/components/CivicPosterCard";
import { LogCivicActionModal } from "@/components/LogCivicActionModal";
import CivicActivityPage from "@/app/activity/page";
import CivicListsPage from "@/app/lists/page";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => "/lists",
  useRouter: () => ({ push }),
}));

afterEach(() => {
  vi.unstubAllGlobals();
  push.mockReset();
});

describe("Civic Letterboxd for Politics features", () => {
  it("renders CivicPosterCard with official provenance tag and action button", async () => {
    const user = userEvent.setup();
    const onLog = vi.fn();

    render(
      <CivicPosterCard
        id="proj-1"
        slug="polavaram"
        type="project"
        titleEn="Polavaram National Irrigation Project"
        titleTe="పోలవరం జాతీయ నీటిపారుదల ప్రాజెక్ట్"
        district="Eluru"
        detailUrl="/projects"
        onLogAction={onLog}
      />,
    );

    expect(
      screen.getByRole("heading", {
        name: "Polavaram National Irrigation Project",
      }),
    ).toBeVisible();
    expect(screen.getByText("Official · Reviewed")).toBeVisible();
    expect(screen.getByText("Project")).toBeVisible();
    expect(screen.getByText("Eluru")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "+ Log" }));
    expect(onLog).toHaveBeenCalledWith({
      id: "proj-1",
      title: "Polavaram National Irrigation Project",
      type: "project",
    });
  });

  it("opens LogCivicActionModal and displays audit notice for community observations", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <LogCivicActionModal
        isOpen={true}
        onClose={onClose}
        initialEntity={{
          id: "sch-1",
          title: "Dr. YSR Rythu Bharosa",
          type: "scheme",
        }}
      />,
    );

    expect(screen.getByText("Log Civic Interaction")).toBeVisible();
    expect(screen.getByDisplayValue("Dr. YSR Rythu Bharosa")).toBeVisible();
    expect(
      screen.getByText(/Your entry will be published with a visible/),
    ).toBeVisible();

    const statusSelect = screen.getByLabelText("Action Status / Observation");
    await user.selectOptions(statusSelect, "Received Benefit");
    expect(statusSelect).toHaveValue("Received Benefit");

    await user.click(screen.getByRole("button", { name: "Publish Log Entry" }));
    expect(
      await screen.findByText(/Civic action recorded! Audit trace registered/),
    ).toBeVisible();
  });

  it("renders Civic Watchlists page with curated dossiers", () => {
    render(<CivicListsPage />);
    expect(
      screen.getByRole("heading", { name: "Civic Watchlists & Dossiers" }),
    ).toBeVisible();
    expect(
      screen.getByText("Rayalaseema Irrigation & Water Resources Watch"),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "+ Create New Watchlist" }),
    ).toBeVisible();
  });

  it("renders Civic Activity Stream page with live feeds and community badges", () => {
    render(<CivicActivityPage />);
    expect(
      screen.getByRole("heading", { name: "Civic Activity Stream" }),
    ).toBeVisible();
    expect(screen.getAllByText("Official Feed").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Community Reported").length).toBeGreaterThan(0);
  });
});
