import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AdminConsole } from "./AdminConsole";

vi.mock("next/navigation", () => ({ usePathname: () => "/admin" }));
vi.mock("@/lib/staff-api", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/staff-api")>("@/lib/staff-api");
  return { ...actual, restoreStaffSession: vi.fn().mockResolvedValue(null) };
});

describe("AdminConsole", () => {
  it("requires staff credentials before showing moderation controls", async () => {
    render(<AdminConsole />);

    expect(
      await screen.findByRole("heading", { name: "Staff sign in" }),
    ).toBeVisible();
    expect(
      screen.queryByRole("heading", { name: "Moderate content" }),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toHaveAttribute("type", "email");
    expect(screen.getByLabelText("Password")).toHaveAttribute(
      "type",
      "password",
    );
  });
});
