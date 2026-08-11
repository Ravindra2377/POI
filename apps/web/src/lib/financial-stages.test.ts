import { describe, expect, it } from "vitest";
import { financialStageLabel, financialStages } from "./financial-stages";

describe("financial stages", () => {
  it("keeps the core stages distinct and ordered", () => {
    expect(financialStages.map((stage) => stage.key)).toEqual([
      "announced",
      "allocated",
      "released",
      "spent",
      "delivered",
    ]);
  });

  it("resolves the user-facing label", () => {
    expect(financialStageLabel("released")).toBe("Released");
  });
});
