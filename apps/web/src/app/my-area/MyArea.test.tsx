import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LocaleProvider } from "@/components/LocaleProvider";
import type { GeographyRecord } from "@/lib/catalog-types";
import { areaDomains, localizedAreaText } from "@/lib/my-area";
import { MyArea } from "./MyArea";

const { params, replace } = vi.hoisted(() => {
  const params = new URLSearchParams();
  const replace = vi.fn((url: string) => {
    const query = url.split("?")[1];
    params.delete("district");
    if (query) {
      for (const [key, value] of new URLSearchParams(query)) {
        params.set(key, value);
      }
    }
  });
  return { params, replace };
});

vi.mock("next/navigation", () => ({
  useSearchParams: () => params,
  useRouter: () => ({ replace }),
  usePathname: () => "",
}));

const district: GeographyRecord = {
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

function response(data: GeographyRecord[]) {
  return {
    ok: true,
    json: async () => ({
      data,
      meta: { page: 1, page_size: 100, total: data.length, total_pages: 1 },
    }),
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  replace.mockClear();
  params.delete("district");
});

describe("my-area domain configuration", () => {
  it("aggregates the five prepared domain directories", () => {
    expect(areaDomains.map((domain) => domain.directoryHref)).toEqual([
      "/schemes",
      "/projects",
      "/public-money",
      "/procurement",
      "/officeholders",
    ]);
    expect(localizedAreaText(areaDomains[0].name, "te")).toBe("పథకాలు");
  });
});

describe("MyArea", () => {
  it("renders the coarse-geography privacy notice and an empty briefing prompt", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response([district])));
    render(
      <LocaleProvider>
        <MyArea />
      </LocaleProvider>,
    );

    expect(
      await screen.findByRole("heading", { name: "My Area" }),
    ).toBeVisible();
    expect(screen.getByText("Coarse geography only")).toBeVisible();
    expect(
      screen.getByText(/No precise location, coordinates or device location/),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", {
        level: 3,
        name: "Choose a district above to see its prepared briefing.",
      }),
    ).toBeVisible();
    expect(
      screen.getByRole("combobox", { name: "Your district" }),
    ).toBeVisible();
  });

  it("selects a district, updates the address and shows prepared panels", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response([district])));
    const user = userEvent.setup();
    const { rerender } = render(
      <LocaleProvider>
        <MyArea />
      </LocaleProvider>,
    );
    await screen.findByRole("heading", { name: "My Area" });
    await screen.findByRole("option", { name: "Visakhapatnam" });

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Your district" }),
      "visakhapatnam",
    );
    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith(
        expect.stringContaining("district=visakhapatnam"),
      ),
    );
    rerender(
      <LocaleProvider>
        <MyArea />
      </LocaleProvider>,
    );
    expect(
      screen.getByRole("heading", {
        name: "Prepared briefing for Visakhapatnam",
      }),
    ).toBeVisible();
    for (const domain of areaDomains) {
      expect(
        screen.getByRole("heading", { name: domain.name.en }),
      ).toBeVisible();
      expect(
        screen.getByRole("link", {
          name: `Open the ${domain.name.en} directory`,
        }),
      ).toHaveAttribute("href", domain.directoryHref);
    }
    expect(
      screen.getAllByText(
        "No reviewed records published for Visakhapatnam yet",
      ),
    ).toHaveLength(5);
  });

  it("searches districts bilingually by English, Telugu and alias", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response([district])));
    const user = userEvent.setup();
    render(
      <LocaleProvider>
        <MyArea />
      </LocaleProvider>,
    );
    await screen.findByRole("heading", { name: "My Area" });
    await screen.findByRole("option", { name: "Visakhapatnam" });

    await user.type(screen.getByRole("searchbox"), "Vizag");
    expect(
      screen.getByRole("option", { name: "Visakhapatnam" }),
    ).toBeInTheDocument();

    await user.type(screen.getByRole("searchbox"), "zzz-no-match");
    expect(
      screen.queryByRole("option", { name: "Visakhapatnam" }),
    ).not.toBeInTheDocument();
  });

  it("shows the alerts-deferred state and honest failures with retry", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(response([district]));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(
      <LocaleProvider>
        <MyArea />
      </LocaleProvider>,
    );

    expect(
      await screen.findByRole("heading", {
        name: "Alerts are planned, not available",
      }),
    ).toBeVisible();
    expect(
      screen.getByText(/No email, phone or push subscription is collected/),
    ).toBeVisible();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The official-record API could not be reached.",
    );
    await user.click(screen.getByRole("button", { name: "Retry" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    await screen.findByRole("combobox", { name: "Your district" });
  });

  it("switches the whole page to Telugu", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response([district])));
    const user = userEvent.setup();
    render(
      <LocaleProvider>
        <MyArea />
      </LocaleProvider>,
    );
    await screen.findByRole("heading", { name: "My Area" });
    await user.selectOptions(screen.getByLabelText("Select language"), "te");

    expect(screen.getByRole("heading", { name: "నా ప్రాంతం" })).toBeVisible();
    expect(screen.getByLabelText("మీ జిల్లా")).toBeVisible();
    expect(
      screen.getByRole("option", { name: "విశాఖపట్నం" }),
    ).toBeInTheDocument();
  });
});
