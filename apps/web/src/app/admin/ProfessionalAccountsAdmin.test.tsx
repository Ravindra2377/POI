import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ProfessionalAccountsAdmin } from "./ProfessionalAccountsAdmin";

const account = {
  id: "11111111-1111-1111-1111-111111111111",
  email: "researcher@example.org",
  display_name: "Researcher",
  organization_name: "Public Interest Lab",
  requested_plan: "professional" as const,
  access_plan: "none" as const,
  billing_status: "not_started" as const,
  status: "pending_review" as const,
  email_verified_at: "2026-08-22T10:00:00Z",
  created_at: "2026-08-22T09:00:00Z",
};

describe("ProfessionalAccountsAdmin", () => {
  it("submits an audited activation decision with plan and billing state", async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn().mockResolvedValue(undefined);
    render(
      <ProfessionalAccountsAdmin
        accounts={[account]}
        auditLog={[]}
        onUpdate={onUpdate}
      />,
    );

    const form = screen.getByRole("form", {
      name: "Manage Public Interest Lab",
    });
    await user.selectOptions(
      within(form).getByLabelText("Account status"),
      "active",
    );
    await user.selectOptions(
      within(form).getByLabelText("Access plan"),
      "professional",
    );
    await user.selectOptions(
      within(form).getByLabelText("Manual billing state"),
      "paid",
    );
    await user.type(
      within(form).getByLabelText("Audited reason"),
      "Payment confirmed after customer scope review",
    );
    await user.click(
      within(form).getByRole("button", { name: "Save account access" }),
    );

    expect(onUpdate).toHaveBeenCalledWith(account.id, {
      status: "active",
      access_plan: "professional",
      billing_status: "paid",
      reason: "Payment confirmed after customer scope review",
    });
  });

  it("locks administrator access controls until email verification", () => {
    render(
      <ProfessionalAccountsAdmin
        accounts={[
          {
            ...account,
            status: "pending_verification",
            email_verified_at: null,
          },
        ]}
        auditLog={[]}
        onUpdate={vi.fn()}
      />,
    );

    expect(
      screen.getByText(/remain locked until the customer verifies/i),
    ).toBeVisible();
    expect(screen.queryByRole("form")).not.toBeInTheDocument();
  });
});
