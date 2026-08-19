import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/projects/route";
import { LocaleProvider } from "@/components/LocaleProvider";
import { StateProvider } from "@/components/StateProvider";
import ProjectDetailPage from "./[slug]/page";
import ProjectsPage from "./page";

afterEach(() => vi.unstubAllGlobals());

describe("project routes", () => {
  it("serves only the explicitly labelled prepared-empty catalogue", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      data: [],
      status: "prepared-empty",
      telugu_reviewed: false,
    });
  });

  it("renders the projects directory route", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: [], status: "prepared-empty" }),
      }),
    );
    render(
      <LocaleProvider>
        <ProjectsPage />
      </LocaleProvider>,
    );
    expect(
      screen.getByRole("heading", { level: 1, name: /Projects/i }),
    ).toBeVisible();
  });

  it("renders an honest unavailable dynamic route", async () => {
    const page = await ProjectDetailPage({
      params: Promise.resolve({ slug: "not-reviewed" }),
    });
    render(<LocaleProvider>{page}</LocaleProvider>);
    expect(
      screen.getByRole("heading", { name: "Project record unavailable" }),
    ).toBeVisible();
    expect(
      screen.getByRole("link", { name: /All .* projects/i }),
    ).toHaveAttribute("href", "/projects");
  });

  it("shows an honest All-India notice and can switch to Andhra Pradesh", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: [], status: "prepared-empty" }),
      }),
    );

    render(
      <LocaleProvider>
        <StateProvider>
          <ProjectsPage />
        </StateProvider>
      </LocaleProvider>,
    );

    expect(
      screen.getByRole("heading", {
        name: "No reviewed records are published for All India yet",
      }),
    ).toBeVisible();

    await user.click(
      screen.getByRole("button", { name: "View Andhra Pradesh records" }),
    );
    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: /Andhra Pradesh Projects/i,
      }),
    ).toBeVisible();
  });
});
