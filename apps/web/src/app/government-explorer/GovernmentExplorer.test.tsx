import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LocaleProvider } from "@/components/LocaleProvider";
import { GovernmentExplorer } from "./GovernmentExplorer";

const district = {
  id: "47a2e870-b0b2-5582-a78f-45590392ae33",
  slug: "visakhapatnam",
  entity_type: "district",
  name_en: "Visakhapatnam",
  name_te: "విశాఖపట్నం",
  official_code: "520",
  official_code_scheme: "LGD district code",
  parent_id: null,
  valid_from: "2022-04-04",
  valid_to: null,
  is_active: true,
  is_pilot: true,
  aliases: [{ value: "Vizag", language: "en", kind: "alternate" }],
  has_point: false,
  has_boundary: false,
  coverage_note: null,
  provenance: {
    source_id: "3ad32d2b-4867-5e58-8918-a9b513e6cf66",
    source_name: "Local Government Directory",
    official_source_url: "https://lgdirectory.gov.in/",
    retrieval_date: "2026-08-10",
    publication_date: null,
    effective_date: "2022-04-04",
    review_status: "reviewed",
    is_fixture: false,
  },
};

function response(data: unknown[]) {
  return {
    ok: true,
    json: async () => ({
      data,
      meta: { page: 1, page_size: 100, total: data.length, total_pages: 1 },
    }),
  };
}

afterEach(() => vi.unstubAllGlobals());

describe("GovernmentExplorer", () => {
  it("renders loading, reviewed data, provenance and coverage disclosure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response([district])));

    render(
      <LocaleProvider>
        <GovernmentExplorer />
      </LocaleProvider>,
    );

    expect(
      screen.getByRole("link", { name: "Viksit Bharat?? home" }),
    ).toBeVisible();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Loading reviewed public records",
    );
    expect(
      await screen.findByRole("heading", { name: "Visakhapatnam" }),
    ).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Local Government Directory" }),
    ).toHaveAttribute("href", "https://lgdirectory.gov.in/");
    expect(
      screen.getByText(/LGD now lists Markapuram and Polavaram/),
    ).toBeVisible();
  });

  it("supports Telugu rendering and native keyboard controls", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response([district])));
    const user = userEvent.setup();

    render(
      <LocaleProvider>
        <GovernmentExplorer />
      </LocaleProvider>,
    );
    await screen.findByRole("heading", { name: "Visakhapatnam" });
    await user.selectOptions(screen.getByLabelText("Select language"), "te");

    expect(screen.getByRole("heading", { name: "విశాఖపట్నం" })).toBeVisible();
    expect(screen.getByRole("search")).toBeVisible();
    expect(screen.getByRole("tab", { name: "జిల్లాలు" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("shows empty and API failure states accessibly", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response([]))
      .mockRejectedValueOnce(new Error("offline"));
    vi.stubGlobal("fetch", fetchMock);

    const { unmount } = render(
      <LocaleProvider>
        <GovernmentExplorer />
      </LocaleProvider>,
    );
    expect(
      await screen.findByText("No reviewed records match this search."),
    ).toBeVisible();
    unmount();

    render(
      <LocaleProvider>
        <GovernmentExplorer />
      </LocaleProvider>,
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The official-record API could not be reached.",
    );
    expect(screen.getByRole("button", { name: "Retry" })).toBeEnabled();
  });

  it("submits alias searches to the versioned API", async () => {
    const fetchMock = vi.fn().mockResolvedValue(response([district]));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(
      <LocaleProvider>
        <GovernmentExplorer />
      </LocaleProvider>,
    );
    await screen.findByRole("heading", { name: "Visakhapatnam" });
    await user.type(screen.getByRole("searchbox"), "Vizag");
    await user.click(screen.getByRole("button", { name: "Search" }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenLastCalledWith(
        expect.stringContaining("q=Vizag"),
        expect.any(Object),
      ),
    );
  });
});
