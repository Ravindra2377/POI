import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AdminOverview } from "./AdminOverview";

const content = [
  {
    target_type: "report" as const,
    target_id: "11111111-1111-1111-1111-111111111111",
    username: "citizen_4819",
    summary_en: "Test field observation",
    summary_te: "పరీక్ష క్షేత్ర పరిశీలన",
    detail_en: "Community-reported evidence awaiting review.",
    classification: "community_reported" as const,
    status: "hidden",
    created_at: "2026-08-20T10:00:00Z",
  },
];

const accounts = [
  {
    id: "22222222-2222-2222-2222-222222222222",
    email: "admin@example.com",
    display_name: "Platform Admin",
    role: "admin" as const,
    is_active: true,
    must_change_password: false,
    created_at: "2026-08-20T09:00:00Z",
  },
];

describe("AdminOverview", () => {
  it("shows admin-only all-status content, staff, and audited actions", async () => {
    const user = userEvent.setup();
    const onContentStatusChange = vi.fn();
    render(
      <AdminOverview
        content={content}
        visibleContent={content}
        staffAccounts={accounts}
        auditLog={[
          {
            id: "33333333-3333-3333-3333-333333333333",
            moderator_id: "Platform administrator",
            action: "hide",
            target_type: "report",
            target_id: content[0].target_id,
            reason: "Confirmed policy violation",
            created_at: "2026-08-20T10:05:00Z",
          },
        ]}
        contentStatus="all"
        onContentStatusChange={onContentStatusChange}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Administrator overview" }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "All community content" }),
    ).toBeVisible();
    expect(screen.getByText("Test field observation")).toBeVisible();
    expect(screen.getByText("పరీక్ష క్షేత్ర పరిశీలన")).toBeVisible();
    expect(screen.getByText("admin@example.com")).toBeVisible();
    expect(screen.getByText("Confirmed policy violation")).toBeVisible();

    await user.selectOptions(screen.getByLabelText("Status filter"), "hidden");
    expect(onContentStatusChange).toHaveBeenCalledWith("hidden");
  });
});
