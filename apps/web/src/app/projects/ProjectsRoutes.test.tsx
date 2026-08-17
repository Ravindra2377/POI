import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/projects/route";
import { LocaleProvider } from "@/components/LocaleProvider";
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
      screen.getByRole("heading", { level: 1, name: "AP Projects" }),
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
      screen.getByRole("link", { name: "← All AP projects" }),
    ).toHaveAttribute("href", "/projects");
  });
});
