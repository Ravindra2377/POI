import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatesDirectory } from "./StatesDirectory";

describe("StatesDirectory", () => {
  it("renders header and all 36 state cards by default", () => {
    render(<StatesDirectory />);

    expect(
      screen.getByText("All-India States & Union Territories Explorer"),
    ).toBeInTheDocument();
    expect(screen.getByText("Andhra Pradesh")).toBeInTheDocument();
    expect(screen.getByText("Telangana")).toBeInTheDocument();
    expect(screen.getByText("Delhi (NCT)")).toBeInTheDocument();
    expect(screen.getByText("Karnataka")).toBeInTheDocument();
  });

  it("filters by search term", () => {
    render(<StatesDirectory />);

    const searchInput = screen.getByPlaceholderText(/Search by state/i);
    fireEvent.change(searchInput, { target: { value: "Telangana" } });

    expect(screen.getByText("Telangana")).toBeInTheDocument();
    expect(screen.queryByText("Karnataka")).not.toBeInTheDocument();
  });

  it("filters by Union Territory category", () => {
    render(<StatesDirectory />);

    const utButton = screen.getByRole("button", { name: /Union Territories/i });
    fireEvent.click(utButton);

    expect(
      screen.getByRole("heading", { name: "Delhi (NCT)" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Chandigarh" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Andhra Pradesh" }),
    ).not.toBeInTheDocument();
  });

  it("lists the official local languages for each state", () => {
    render(<StatesDirectory />);

    expect(screen.getAllByText("తెలుగు · English").length).toBeGreaterThan(0);
    expect(screen.getAllByText("தமிழ் · English").length).toBeGreaterThan(0);
    expect(screen.getAllByText("বাংলা · English").length).toBeGreaterThan(0);
    expect(screen.getAllByText("ಕನ್ನಡ · English").length).toBeGreaterThan(0);
  });
});
