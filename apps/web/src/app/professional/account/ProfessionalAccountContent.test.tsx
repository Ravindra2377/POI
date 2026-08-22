import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LocaleProvider } from "@/components/LocaleProvider";
import { ProfessionalAccountContent } from "./ProfessionalAccountContent";

const searchParams = new URLSearchParams();
vi.mock("next/navigation", () => ({ useSearchParams: () => searchParams }));

const activeAccount = {
  id: "11111111-1111-1111-1111-111111111111",
  email: "researcher@example.org",
  display_name: "Researcher",
  organization_name: "Public Interest Lab",
  requested_plan: "professional",
  access_plan: "professional",
  billing_status: "paid",
  status: "active",
  email_verified_at: "2026-08-22T10:00:00Z",
  created_at: "2026-08-22T09:00:00Z",
};

function response(body: unknown, status = 200) {
  return Promise.resolve(
    new Response(body === null ? null : JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

beforeEach(() => {
  sessionStorage.clear();
  searchParams.delete("verify");
  vi.restoreAllMocks();
});

describe("ProfessionalAccountContent", () => {
  it("shows a truthful closed-registration state while retaining sign in", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        response({
          registration_enabled: false,
          email_verification_available: false,
        }),
      ),
    );
    render(
      <LocaleProvider>
        <ProfessionalAccountContent />
      </LocaleProvider>,
    );

    expect(
      await screen.findByText(/registrations are temporarily closed/i),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "Professional sign in" }),
    ).toBeVisible();
  });

  it("submits a separate professional registration with accepted terms", async () => {
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(() =>
        response({
          registration_enabled: true,
          email_verification_available: true,
        }),
      )
      .mockImplementationOnce(() => response({ message: "accepted" }, 202));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(
      <LocaleProvider>
        <ProfessionalAccountContent />
      </LocaleProvider>,
    );

    const section = await screen.findByRole("heading", {
      name: "Create an account",
    });
    const form = section.closest("section") as HTMLElement;
    await user.type(within(form).getByLabelText("Your name"), "Researcher");
    await user.type(
      within(form).getByLabelText("Organisation name"),
      "Public Interest Lab",
    );
    await user.type(
      within(form).getByLabelText("Work email"),
      "researcher@example.org",
    );
    await user.type(
      within(form).getByLabelText("Password"),
      "Strong-professional-password-2026",
    );
    await user.click(within(form).getByRole("checkbox"));
    await user.click(
      within(form).getByRole("button", { name: "Create account" }),
    );

    expect(await screen.findByText(/Registration received/)).toBeVisible();
    const request = fetchMock.mock.calls[1][1] as RequestInit;
    expect(JSON.parse(String(request.body))).toMatchObject({
      email: "researcher@example.org",
      requested_plan: "professional",
      accept_terms: true,
    });
  });

  it("stores the isolated customer session and renders active access", async () => {
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(() =>
        response({
          registration_enabled: false,
          email_verification_available: false,
        }),
      )
      .mockImplementationOnce(() =>
        response({
          access_token: "customer-token",
          expires_at: "2026-08-23T10:00:00Z",
          account: activeAccount,
        }),
      );
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(
      <LocaleProvider>
        <ProfessionalAccountContent />
      </LocaleProvider>,
    );

    const heading = await screen.findByRole("heading", {
      name: "Professional sign in",
    });
    const form = heading.closest("section") as HTMLElement;
    await user.type(
      within(form).getByLabelText("Work email"),
      "researcher@example.org",
    );
    await user.type(
      within(form).getByLabelText("Password"),
      "Strong-professional-password-2026",
    );
    await user.click(within(form).getByRole("button", { name: "Sign in" }));

    expect(
      await screen.findByRole("heading", { name: "Your professional account" }),
    ).toBeVisible();
    expect(screen.getByText("Public Interest Lab")).toBeVisible();
    await waitFor(() =>
      expect(sessionStorage.getItem("viksit_professional_session")).toBe(
        "customer-token",
      ),
    );
  });
});
