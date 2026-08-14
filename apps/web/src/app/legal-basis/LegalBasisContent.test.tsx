import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { LocaleProvider, useLocale } from "@/components/LocaleProvider";
import { PageFooter } from "@/components/PageFooter";
import { LegalBasisContent } from "./LegalBasisContent";

function TeluguControl() {
  const { setLocale } = useLocale();
  return (
    <button type="button" onClick={() => setLocale("te")}>
      తెలుగు
    </button>
  );
}

describe("legal and constitutional basis", () => {
  it("links the footer action to the dedicated legal-basis route", () => {
    render(<PageFooter />);

    expect(
      screen.getByRole("link", { name: /Legal & constitutional basis/ }),
    ).toHaveAttribute("href", "/legal-basis");
  });

  it("states constitutional rights, statutory limits and the legal disclaimer", () => {
    render(
      <LocaleProvider>
        <LegalBasisContent />
      </LocaleProvider>,
    );

    expect(screen.getByText("Article 19(1)(a)")).toBeVisible();
    expect(screen.getByText("Article 19(2)")).toBeVisible();
    expect(screen.getByText("Article 51A(h)")).toBeVisible();
    expect(screen.getByText("Section 3")).toBeVisible();
    expect(screen.getByText("Sections 8, 9 & 11")).toBeVisible();
    expect(screen.getByText(/It is not legal advice/)).toBeVisible();
    expect(
      screen.getByRole("link", {
        name: "Constitution of India — Legislative Department",
      }),
    ).toHaveAttribute(
      "href",
      "https://legislative.gov.in/constitution-of-india/",
    );
  });

  it("renders the legal explanation in Telugu", async () => {
    const user = userEvent.setup();
    render(
      <LocaleProvider>
        <TeluguControl />
        <LegalBasisContent />
      </LocaleProvider>,
    );

    await user.click(screen.getByRole("button", { name: "తెలుగు" }));
    expect(screen.getByText("చట్టపరమైన & రాజ్యాంగ ఆధారం")).toBeVisible();
    expect(document.documentElement).toHaveAttribute("lang", "te");
  });
});
