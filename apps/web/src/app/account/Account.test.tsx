import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { LocaleProvider } from "@/components/LocaleProvider";
import {
  accountReportDomains,
  consentChoices,
  localizedAccountText,
} from "@/lib/accounts";
import { AccountContent } from "./AccountContent";

vi.mock("next/navigation", () => ({
  usePathname: () => "",
}));

describe("account domain configuration", () => {
  it("configures only planned consent choices and prepared report domains", () => {
    expect(consentChoices).toHaveLength(2);
    expect(consentChoices.map((choice) => choice.key)).toEqual([
      "area-alerts",
      "evidence",
    ]);
    for (const choice of consentChoices) {
      expect(choice.planned).toBe(true);
      expect(choice.label.en.length).toBeGreaterThan(0);
      expect(choice.label.te.length).toBeGreaterThan(0);
      expect(choice.description.en.length).toBeGreaterThan(0);
      expect(choice.description.te.length).toBeGreaterThan(0);
    }
    expect(accountReportDomains).toHaveLength(5);
    for (const domain of accountReportDomains) {
      expect(domain.directoryHref.startsWith("/")).toBe(true);
    }
    expect(localizedAccountText(accountReportDomains[0].name, "te")).toBe(
      "పథకాలు",
    );
  });
});

describe("AccountContent", () => {
  it("renders an honest prepared account shell with planned consent choices", () => {
    render(
      <LocaleProvider>
        <AccountContent />
      </LocaleProvider>,
    );

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Your account is not open yet",
      }),
    ).toBeVisible();
    expect(
      screen.getByRole("complementary", { name: "Nothing is collected today" }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", {
        name: "Consent choices are planned, not available",
      }),
    ).toBeVisible();
    expect(screen.getAllByText("Planned")).toHaveLength(2);
    expect(screen.queryByText("Language preference")).not.toBeInTheDocument();
    expect(
      screen.getByText(
        "Language is already available from the header selector and needs no account.",
      ),
    ).toBeVisible();

    expect(
      screen.getAllByText("No reviewed records published yet"),
    ).toHaveLength(5);
    expect(
      screen.getByRole("link", { name: "Open the Schemes directory" }),
    ).toHaveAttribute("href", "/schemes");
    expect(
      screen.getByRole("heading", {
        name: "Review controls come before accounts",
      }),
    ).toBeVisible();
  });

  it("switches the prepared account copy to Telugu", async () => {
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
        name: "మీ ఖాతా ఇంకా తెరవబడలేదు",
      }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", {
        name: "సమ్మతి ఎంపికలు ప్రణాళికలో ఉన్నాయి, అందుబాటులో లేవు",
      }),
    ).toBeVisible();
  });
});
