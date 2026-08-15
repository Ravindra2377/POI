import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LocaleProvider } from "@/components/LocaleProvider";
import {
  filterProjects,
  type ProjectRecord,
  type ProjectSourceRecord,
} from "@/lib/projects";
import { ProjectDetail } from "./ProjectDetail";
import { ProjectsDirectory } from "./ProjectsDirectory";

const source: ProjectSourceRecord = {
  source_record_id: "test-project-source-record",
  source_name: "Test Project Register",
  official_source_url: "https://example.gov.in/test-project",
  retrieval_date: "2026-08-15",
  review_status: "reviewed",
};

const claim = <T,>(value: T) => ({
  classification: "official" as const,
  value,
  source,
});

const testProject: ProjectRecord = {
  slug: "test-water-project",
  name: claim({ en: "Test Water Project", te: "పరీక్ష నీటి ప్రాజెక్టు" }),
  description: claim({
    en: "A test-only project description.",
    te: "పరీక్షల కోసం మాత్రమే ప్రాజెక్టు వివరణ.",
  }),
  department: claim({ en: "Water Department", te: "జల శాఖ" }),
  districts: claim([{ en: "Test District", te: "పరీక్ష జిల్లా" }]),
  status: claim({ en: "In progress", te: "పనిలో ఉంది" }),
  project_type: claim({
    en: "Water infrastructure",
    te: "నీటి మౌలిక సదుపాయాలు",
  }),
  responsible_office: claim({
    en: "Test Division Office",
    te: "పరీక్ష డివిజన్ కార్యాలయం",
  }),
  timeline: claim({
    start_date: "2026-01-10",
    expected_completion_date: "2027-06-30",
    actual_completion_date: null,
  }),
};

const otherTestProject: ProjectRecord = {
  ...testProject,
  slug: "test-road-project",
  name: claim({ en: "Test Road Project", te: "పరీక్ష రహదారి ప్రాజెక్టు" }),
  department: claim({ en: "Roads Department", te: "రోడ్ల శాఖ" }),
  status: claim({ en: "Completed", te: "పూర్తయింది" }),
};

function response(data: ProjectRecord[]) {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      data,
      status: data.length ? "reviewed" : "prepared-empty",
    }),
  };
}

afterEach(() => vi.unstubAllGlobals());

describe("project filtering", () => {
  it("combines department, district, status and project-type filters", () => {
    expect(
      filterProjects([testProject], {
        department: "Water Department",
        district: "Test District",
        status: "In progress",
        projectType: "Water infrastructure",
      }),
    ).toEqual([testProject]);
    expect(
      filterProjects([testProject], {
        department: "Water Department",
        district: "Another District",
        status: "In progress",
        projectType: "Water infrastructure",
      }),
    ).toEqual([]);
  });
});

describe("ProjectsDirectory", () => {
  it("renders loading and explicitly prepared empty states", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response([])));
    render(
      <LocaleProvider>
        <ProjectsDirectory />
      </LocaleProvider>,
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      "Loading the reviewed project catalogue",
    );
    expect(
      await screen.findByRole("heading", {
        name: "No reviewed project records are published yet",
      }),
    ).toBeVisible();
    expect(
      screen.getByText(
        /not a claim that Andhra Pradesh has no public projects/,
      ),
    ).toBeVisible();
    expect(
      screen.getByRole("group", { name: "Filter reviewed projects" }),
    ).toBeVisible();
  });

  it("renders bilingual claims, timeline and all four native filters", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response([testProject])));
    const user = userEvent.setup();
    render(
      <LocaleProvider>
        <ProjectsDirectory />
      </LocaleProvider>,
    );

    expect(
      await screen.findByRole("heading", { name: "Test Water Project" }),
    ).toBeVisible();
    expect(screen.getAllByText("Official · Reviewed")).toHaveLength(8);
    expect(
      screen.getAllByRole("link", { name: "Test Project Register" }),
    ).toHaveLength(8);
    expect(screen.getByText("Test Division Office")).toBeVisible();
    expect(screen.getByText("2027-06-30")).toBeVisible();

    await user.selectOptions(
      screen.getByLabelText("District"),
      "Test District",
    );
    await user.selectOptions(screen.getByLabelText("Status"), "In progress");
    await user.selectOptions(
      screen.getByLabelText("Project type"),
      "Water infrastructure",
    );
    await user.selectOptions(
      screen.getByLabelText("Department"),
      "Water Department",
    );
    await user.selectOptions(screen.getByLabelText("Select language"), "te");
    expect(
      screen.getByRole("heading", { name: "పరీక్ష నీటి ప్రాజెక్టు" }),
    ).toBeVisible();
    expect(screen.getByLabelText("జిల్లా")).toHaveValue("Test District");
  });

  it("shows filtered-empty and retryable error states", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(response([testProject, otherTestProject]));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(
      <LocaleProvider>
        <ProjectsDirectory />
      </LocaleProvider>,
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No project information is being substituted",
    );
    await user.click(screen.getByRole("button", { name: "Retry" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    await screen.findByRole("heading", { name: "Test Water Project" });
    await user.selectOptions(
      screen.getByLabelText("Department"),
      "Water Department",
    );
    await user.selectOptions(screen.getByLabelText("Status"), "Completed");
    expect(
      screen.getByText("No reviewed projects match these filters"),
    ).toBeVisible();
  });
});

describe("ProjectDetail", () => {
  it("shows unavailable status without claiming that a project does not exist", () => {
    render(
      <LocaleProvider>
        <ProjectDetail project={null} requestedSlug="not-reviewed" />
      </LocaleProvider>,
    );
    expect(
      screen.getByRole("heading", { name: "Project record unavailable" }),
    ).toBeVisible();
    expect(
      screen.getByText(/does not establish that a project exists/),
    ).toBeVisible();
  });

  it("places provenance beside every project claim", () => {
    render(
      <LocaleProvider>
        <ProjectDetail project={testProject} requestedSlug={testProject.slug} />
      </LocaleProvider>,
    );
    expect(screen.getAllByText("Official · Reviewed")).toHaveLength(8);
    expect(
      screen.getAllByRole("link", { name: "Test Project Register" }),
    ).toHaveLength(8);
    expect(screen.getByText("Not stated in source")).toBeVisible();
  });
});
