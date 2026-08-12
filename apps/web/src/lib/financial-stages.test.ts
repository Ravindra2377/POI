import { describe, expect, it } from "vitest";
import { financialStageLabel, financialStages } from "./financial-stages";

describe("financial stages", () => {
  it("keeps the approved public-money stages distinct and ordered", () => {
    expect(financialStages.map((stage) => stage.key)).toEqual([
      "announcement",
      "budget-estimate",
      "revised-estimate",
      "funds-released",
      "utilisation",
      "actual-expenditure",
      "tender-estimate",
      "contract-award",
      "revised-project-cost",
      "physical-progress",
      "public-outcome",
    ]);
  });

  it("resolves the user-facing label", () => {
    expect(financialStageLabel("funds-released")).toBe("Funds Released");
  });
});
