import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ExploreData } from "./ExploreData";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

describe("ExploreData", () => {
  it("shows India-wide coverage while identifying Andhra Pradesh as the only live dataset", async () => {
    const user = userEvent.setup();
    render(<ExploreData />);

    expect(
      screen.getByText(
        "India-wide structure. Reviewed records where available.",
      ),
    ).toBeVisible();
    const directory = screen.getByTestId("state-directory");
    expect(directory).toHaveTextContent("Andhra Pradesh");
    expect(directory).toHaveTextContent("Reviewed data live");
    expect(directory).toHaveTextContent("Tamil Nadu");
    expect(directory).toHaveTextContent("Planned");

    await user.click(screen.getByRole("tab", { name: "Sectors" }));
    expect(screen.getByTestId("sector-directory")).toHaveTextContent("Health");
    expect(screen.getByTestId("sector-directory")).toHaveTextContent(
      "Social welfare",
    );
    expect(screen.getAllByText("AP structure live")).toHaveLength(3);
  });

  it("filters the national directory with a labelled native search control", async () => {
    const user = userEvent.setup();
    render(<ExploreData />);

    await user.type(screen.getByLabelText("Filter directory"), "Andhra");
    expect(screen.getByTestId("state-directory")).toHaveTextContent(
      "Andhra Pradesh",
    );
    expect(screen.queryByText("Tamil Nadu")).not.toBeInTheDocument();
  });
});
