import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { CivicTrackingCollection } from "@/components/CivicTrackingCollection";
import { LocaleProvider } from "@/components/LocaleProvider";
import { RecordWatchControl } from "@/components/RecordWatchControl";
import {
  followCivicRecord,
  readCivicTracking,
  unfollowCivicRecord,
} from "@/lib/civic-tracking";

const record = {
  id: "scheme:test-scheme",
  kind: "scheme" as const,
  title: "Reviewed test scheme",
  href: "/schemes/test-scheme",
};

describe("device-private civic tracking", () => {
  it("stores a bounded record reference and preserves follow/remove diary events", () => {
    followCivicRecord(record);
    let state = readCivicTracking();

    expect(state.watchlist).toHaveLength(1);
    expect(state.watchlist[0]).toMatchObject(record);
    expect(state.diary[0]).toMatchObject({ action: "followed", record });

    unfollowCivicRecord(record);
    state = readCivicTracking();
    expect(state.watchlist).toHaveLength(0);
    expect(state.diary[0]).toMatchObject({ action: "removed", record });
    expect(state.diary[1]).toMatchObject({ action: "followed", record });
  });

  it("rejects unsafe record links before writing browser storage", () => {
    expect(() =>
      followCivicRecord({ ...record, href: "https://malicious.example" }),
    ).toThrow("Invalid civic record reference");
    expect(() =>
      followCivicRecord({ ...record, href: "/\\malicious.example" }),
    ).toThrow("Invalid civic record reference");
    expect(readCivicTracking().watchlist).toHaveLength(0);
  });

  it("follows a reviewed record and exposes it in My Files", async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <LocaleProvider>
        <RecordWatchControl record={record} />
      </LocaleProvider>,
    );

    const follow = await screen.findByRole("button", {
      name: /Follow this record/,
    });
    await user.click(follow);
    expect(follow).toHaveAttribute("aria-pressed", "true");

    rerender(
      <LocaleProvider>
        <CivicTrackingCollection mode="watchlist" />
      </LocaleProvider>,
    );
    const collection = await screen.findByRole("region", {
      name: "My files",
    });
    expect(within(collection).getByText(record.title)).toBeVisible();
    expect(
      within(collection).getByRole("link", { name: /Open reviewed record/ }),
    ).toHaveAttribute("href", record.href);
  });

  it("provides Telugu tracking controls", async () => {
    localStorage.setItem("viksit_selected_locale", "te");
    render(
      <LocaleProvider>
        <RecordWatchControl record={record} />
      </LocaleProvider>,
    );

    expect(
      await screen.findByRole("button", {
        name: "ఈ రికార్డును అనుసరించండి",
      }),
    ).toBeVisible();
    await waitFor(() =>
      expect(
        screen.getByText("ఈ పరికరంలో మాత్రమే భద్రపరచబడింది"),
      ).toBeVisible(),
    );
  });
});
