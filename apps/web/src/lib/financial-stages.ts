export const financialStages = [
  {
    key: "announcement",
    label: "Announcement",
    description: "Political or policy commitment; not proof of expenditure.",
  },
  {
    key: "budget-estimate",
    label: "Budget Estimate",
    description: "Planned allocation in a budget document.",
  },
  {
    key: "revised-estimate",
    label: "Revised Estimate",
    description: "Updated allocation during the financial year.",
  },
  {
    key: "funds-released",
    label: "Funds Released",
    description: "Money reported as transferred to an implementing body.",
  },
  {
    key: "utilisation",
    label: "Utilisation",
    description:
      "Funds reported as used, often through utilisation certificates.",
  },
  {
    key: "actual-expenditure",
    label: "Actual Expenditure",
    description: "Accounted expenditure reported for the period.",
  },
  {
    key: "tender-estimate",
    label: "Tender Estimate",
    description: "Estimated procurement value before an award.",
  },
  {
    key: "contract-award",
    label: "Contract Award",
    description: "Value awarded to a supplier; not a public outcome.",
  },
  {
    key: "revised-project-cost",
    label: "Revised Project Cost",
    description: "A later approved or reported project cost.",
  },
  {
    key: "physical-progress",
    label: "Physical Progress",
    description: "Work completion reported separately from financial progress.",
  },
  {
    key: "public-outcome",
    label: "Public Outcome",
    description:
      "A measurable public result, distinct from spending and progress.",
  },
] as const;

export function financialStageLabel(
  key: (typeof financialStages)[number]["key"],
): string {
  return financialStages.find((stage) => stage.key === key)?.label ?? "Unknown";
}
