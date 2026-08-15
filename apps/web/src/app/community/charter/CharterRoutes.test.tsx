import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LocaleProvider } from "@/components/LocaleProvider";
import CharterPage from "./page";

vi.mock("next/navigation", () => ({
  usePathname: () => "",
}));

describe("charter route", () => {
  it("renders the Community Charter route", () => {
    render(
      <LocaleProvider>
        <CharterPage />
      </LocaleProvider>,
    );
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "The rules of participation, written before it opens.",
      }),
    ).toBeVisible();
    expect(
      screen.getByText(/This charter is a commitment, not an open door/),
    ).toBeVisible();
  });
});
