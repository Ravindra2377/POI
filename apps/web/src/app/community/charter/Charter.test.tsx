import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { LocaleProvider } from "@/components/LocaleProvider";
import {
  charterRules,
  evidenceClasses,
  localizedCommunityText,
} from "@/lib/community";
import { CharterContent } from "./CharterContent";

vi.mock("next/navigation", () => ({
  usePathname: () => "",
}));

describe("charter domain configuration", () => {
  it("configures the four evidence classes and four planned rules", () => {
    expect(evidenceClasses).toHaveLength(4);
    for (const evidenceClass of evidenceClasses) {
      expect(evidenceClass.kind.length).toBeGreaterThan(0);
      expect(evidenceClass.title.en.length).toBeGreaterThan(0);
      expect(evidenceClass.title.te.length).toBeGreaterThan(0);
    }
    expect(charterRules).toHaveLength(4);
    for (const rule of charterRules) {
      expect(rule.planned).toBe(true);
      expect(rule.title.en.length).toBeGreaterThan(0);
      expect(rule.description.te.length).toBeGreaterThan(0);
    }
    expect(localizedCommunityText(evidenceClasses[3].title, "te")).toBe(
      "సమాజ-నివేదిత",
    );
  });
});

describe("CharterContent", () => {
  it("renders the charter as a commitment with evidence classes and rules", () => {
    render(
      <LocaleProvider>
        <CharterContent />
      </LocaleProvider>,
    );

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "The rules of participation, written before it opens.",
      }),
    ).toBeVisible();
    expect(
      screen.getByRole("complementary", {
        name: "Participation is still closed",
      }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", {
        name: "Community evidence never becomes official fact.",
      }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "Community-reported" }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "What is never allowed" }),
    ).toBeVisible();
    expect(screen.getAllByText("Planned")).toHaveLength(4);
    expect(
      screen.getByRole("link", { name: "Community participation status" }),
    ).toHaveAttribute("href", "/community");
  });

  it("switches the charter copy to Telugu", async () => {
    const user = userEvent.setup();
    render(
      <LocaleProvider>
        <CharterContent />
      </LocaleProvider>,
    );

    await user.selectOptions(screen.getByLabelText("Select language"), "te");

    expect(
      screen.getByRole("heading", {
        name: "సమాజ సాక్ష్యం ఎప్పుడూ అధికారిక వాస్తవం కాదు.",
      }),
    ).toBeVisible();
    expect(
      screen.getByRole("link", { name: "కమ్యూనిటీ భాగస్వామ్య స్థితి" }),
    ).toHaveAttribute("href", "/community");
  });
});
