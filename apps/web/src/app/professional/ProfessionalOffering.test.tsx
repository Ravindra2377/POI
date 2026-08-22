import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { LocaleProvider } from "@/components/LocaleProvider";
import { SiteHeader } from "@/components/SiteHeader";
import { ProfessionalOffering } from "./ProfessionalOffering";

vi.mock("next/navigation", () => ({
  usePathname: () => "/professional",
}));

describe("ProfessionalOffering", () => {
  it("keeps public records free and routes customers through separate accounts", () => {
    render(
      <LocaleProvider>
        <ProfessionalOffering />
      </LocaleProvider>,
    );

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /Public records stay free/,
      }),
    ).toBeVisible();
    expect(
      screen.getByRole("complementary", { name: "No public-data paywall" }),
    ).toBeVisible();
    expect(screen.getByText("₹999 / month")).toBeVisible();
    expect(screen.getByText("From ₹7,500 / month")).toBeVisible();
    expect(screen.getByText(/not self-service subscriptions/)).toBeVisible();
    expect(screen.getByText(/No sale of citizen identities/)).toBeVisible();
    expect(
      screen.getByRole("link", {
        name: "Create or sign in to a professional account",
      }),
    ).toHaveAttribute("href", "/professional/account");
  });

  it("provides Telugu copy for the professional account boundary", async () => {
    const user = userEvent.setup();
    render(
      <LocaleProvider>
        <SiteHeader />
        <ProfessionalOffering />
      </LocaleProvider>,
    );

    await user.selectOptions(screen.getByLabelText("Select language"), "te");

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /ప్రజా రికార్డులు ఉచితంగానే ఉంటాయి/,
      }),
    ).toBeVisible();
    expect(
      screen.getByRole("link", { name: "వృత్తిపరమైన సేవలు" }),
    ).toHaveAttribute("href", "/professional");
    expect(
      screen.getByRole("link", {
        name: "వృత్తిపరమైన ఖాతాను సృష్టించండి లేదా సైన్ ఇన్ చేయండి",
      }),
    ).toHaveAttribute("href", "/professional/account");
  });
});
