import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { LocaleProvider } from "@/components/LocaleProvider";
import {
  charterRules,
  evidenceClasses,
  localizedCommunityText,
  participationModes,
  pollDisclosures,
  readinessGates,
} from "@/lib/community";
import { CommunityContent } from "./CommunityContent";

vi.mock("next/navigation", () => ({
  usePathname: () => "",
}));

describe("community domain configuration", () => {
  it("configures only planned participation, disclosures and readiness gates", () => {
    expect(participationModes).toHaveLength(2);
    for (const mode of participationModes) {
      expect(mode.planned).toBe(true);
      expect(mode.title.en.length).toBeGreaterThan(0);
      expect(mode.title.te.length).toBeGreaterThan(0);
    }
    expect(readinessGates).toHaveLength(7);
    for (const gate of readinessGates) {
      expect(gate.planned).toBe(true);
      expect(gate.title.en.length).toBeGreaterThan(0);
      expect(gate.title.te.length).toBeGreaterThan(0);
      expect(gate.description.en.length).toBeGreaterThan(0);
    }
    expect(pollDisclosures).toHaveLength(4);
    for (const disclosure of pollDisclosures) {
      expect(disclosure.planned).toBe(true);
      expect(disclosure.title.en.length).toBeGreaterThan(0);
      expect(disclosure.title.te.length).toBeGreaterThan(0);
    }
    expect(evidenceClasses).toHaveLength(4);
    expect(charterRules).toHaveLength(4);
    for (const rule of charterRules) {
      expect(rule.planned).toBe(true);
      expect(rule.title.en.length).toBeGreaterThan(0);
    }
    expect(localizedCommunityText(readinessGates[0].title, "te")).toBe(
      "సమీక్షించదగిన గుర్తింపు",
    );
  });
});

describe("CommunityContent", () => {
  it("renders a prepared community shell that is closed and never representative", () => {
    render(
      <LocaleProvider>
        <CommunityContent />
      </LocaleProvider>,
    );

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Public experience, clearly separate from official fact.",
      }),
    ).toBeVisible();
    expect(
      screen.getByRole("complementary", {
        name: "Community participation is not yet open",
      }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", {
        name: "Participation modes are planned, not open",
      }),
    ).toBeVisible();
    expect(screen.getAllByText("Planned")).toHaveLength(13);
    expect(
      screen.getByRole("heading", {
        name: "No poll result here represents India or Andhra Pradesh",
      }),
    ).toBeVisible();
    expect(
      screen.getByText(
        /never be described as representative of Andhra Pradesh/,
      ),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", {
        name: "What must exist before participation opens",
      }),
    ).toBeVisible();
    expect(
      screen.getByText(
        /Every future moderation action will produce an immutable audit record/,
      ),
    ).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Read the community charter" }),
    ).toHaveAttribute("href", "/community/charter");
  });

  it("switches the prepared community copy to Telugu", async () => {
    const user = userEvent.setup();
    render(
      <LocaleProvider>
        <CommunityContent />
      </LocaleProvider>,
    );

    await user.selectOptions(screen.getByLabelText("Select language"), "te");

    expect(
      screen.getByRole("heading", {
        name: "భాగస్వామ్య మార్గాలు ప్రణాళికలో ఉన్నాయి, తెరవబడలేదు",
      }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", {
        name: "భాగస్వామ్యం తెరవడానికి ముందు ఏమి ఉండాలి",
      }),
    ).toBeVisible();
    expect(
      screen.getByRole("link", { name: "కమ్యూనిటీ చార్టర్ చదవండి" }),
    ).toHaveAttribute("href", "/community/charter");
  });
});
