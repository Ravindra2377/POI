import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CivicHomeStatus } from "@/components/CivicHomeStatus";
import { LocaleProvider } from "@/components/LocaleProvider";
import { followCivicRecord } from "@/lib/civic-tracking";

const record = {
  id: "project:homepage-status",
  kind: "project" as const,
  title: "Reviewed homepage project",
  href: "/projects/homepage-status",
};

describe("civic homepage shelf", () => {
  it("shows device-private watchlist and diary counts", async () => {
    followCivicRecord(record);
    render(
      <LocaleProvider>
        <CivicHomeStatus />
      </LocaleProvider>,
    );

    expect(await screen.findAllByText("1", { selector: "dd" })).toHaveLength(2);
    expect(screen.getByText("records followed")).toBeVisible();
    expect(screen.getByText("diary moments")).toBeVisible();
    expect(
      screen.getByRole("link", { name: /Open watchlist/ }),
    ).toHaveAttribute("href", "/lists");
  });

  it("localises the private shelf for Telugu", async () => {
    localStorage.setItem("viksit_selected_locale", "te");
    render(
      <LocaleProvider>
        <CivicHomeStatus />
      </LocaleProvider>,
    );

    expect(await screen.findByText("ఈ పరికరంలో ప్రైవేట్")).toBeVisible();
    expect(
      screen.getByRole("heading", {
        name: "మీరు ఆపిన చోటు నుంచి కొనసాగించండి.",
      }),
    ).toBeVisible();
  });
});
