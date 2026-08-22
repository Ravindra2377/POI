import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LocaleProvider } from "@/components/LocaleProvider";
import { IngestionContent } from "./IngestionContent";

const feed = {
  source: {
    name: "Local Government Directory district list",
    publisher: "Local Government Directory (LGD)",
    official_source_url:
      "https://lgdirectory.gov.in/webservices/lgdws/districtList",
    public_source_url: "https://lgdirectory.gov.in/",
    access_method: "api",
    review_status: "reviewed",
  },
  latest_snapshot: {
    sha256: "a".repeat(64),
    retrieved_at: "2026-08-15T08:00:00Z",
    http_status: 200,
    content_type: "application/json",
    file_size_bytes: 1234,
  },
  latest_extraction: {
    adapter_name: "lgd-district-list-adapter",
    adapter_version: "1.0.0",
    status: "succeeded",
    extracted_record_count: 28,
    software_revision: "district-feed-1.0.0",
  },
  observation_counts: { total: 112, published: 112 },
  latest_review: { decision: "approve", decided_at: "2026-08-15T08:01:00Z" },
};

function response(payload: unknown) {
  return { ok: true, json: async () => payload };
}

afterEach(() => vi.unstubAllGlobals());

describe("IngestionContent", () => {
  it("renders loading, feed provenance and status metadata", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response([feed])));

    render(
      <LocaleProvider>
        <IngestionContent />
      </LocaleProvider>,
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      "Loading ingestion status",
    );
    expect(
      await screen.findByRole("heading", {
        name: "Local Government Directory district list",
      }),
    ).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Open the official source" }),
    ).toHaveAttribute("href", "https://lgdirectory.gov.in/");
    expect(
      screen.getByText(
        "https://lgdirectory.gov.in/webservices/lgdws/districtList",
      ),
    ).toBeVisible();
    expect(screen.getByText(/HTTP 200 · application\/json/)).toBeVisible();
    expect(screen.getByText(/Checksum: aaaaaaaaaaaa…/)).toBeVisible();
    expect(screen.getByText(/Records: 28 · succeeded/)).toBeVisible();
    expect(screen.getByText(/112 \/ 112 published/)).toBeVisible();
    expect(screen.getByText("Approved")).toBeVisible();
    expect(
      screen.getByText(
        /Raw snapshot contents are never served by the public API/,
      ),
    ).toBeVisible();
    expect(screen.getByRole("link", { name: "FileKholo home" })).toBeVisible();
  });

  it("supports Telugu rendering and hides reviewer identities", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response([feed])));
    const user = userEvent.setup();

    render(
      <LocaleProvider>
        <IngestionContent />
      </LocaleProvider>,
    );
    await screen.findByRole("heading", {
      name: "Local Government Directory district list",
    });
    await user.selectOptions(screen.getByLabelText("Select language"), "te");

    expect(screen.getByRole("heading", { name: "డేటా సేకరణ" })).toBeVisible();
    expect(screen.getByText("ఆమోదించబడింది")).toBeVisible();
    expect(screen.queryByText("test-operator")).not.toBeInTheDocument();
  });

  it("shows prepared empty and API failure states accessibly", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response([]))
      .mockRejectedValueOnce(new Error("offline"));
    vi.stubGlobal("fetch", fetchMock);

    const { unmount } = render(
      <LocaleProvider>
        <IngestionContent />
      </LocaleProvider>,
    );
    expect(
      await screen.findByText("No network ingestion runs recorded yet."),
    ).toBeVisible();
    expect(
      screen.getByText(
        /until then no raw official response is stored or published/,
      ),
    ).toBeVisible();
    unmount();

    render(
      <LocaleProvider>
        <IngestionContent />
      </LocaleProvider>,
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The official-record API could not be reached.",
    );
    expect(screen.getByRole("button", { name: "Retry" })).toBeEnabled();
  });

  it("requests the versioned ingestion feeds endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue(response([feed]));
    vi.stubGlobal("fetch", fetchMock);

    render(
      <LocaleProvider>
        <IngestionContent />
      </LocaleProvider>,
    );
    await screen.findByRole("heading", {
      name: "Local Government Directory district list",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/ingestion/feeds"),
      expect.any(Object),
    );
  });
});
