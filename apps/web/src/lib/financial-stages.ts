export const financialStages = [
  {
    key: "announced",
    label: "Announced",
    description: "Political or policy commitment",
  },
  {
    key: "allocated",
    label: "Allocated",
    description: "Budget provision for a purpose",
  },
  {
    key: "released",
    label: "Released",
    description: "Funds transferred to an implementing body",
  },
  {
    key: "spent",
    label: "Spent",
    description: "Accounted expenditure reported",
  },
  {
    key: "delivered",
    label: "Delivered",
    description: "Physical progress and public outcome",
  },
] as const;

export function financialStageLabel(
  key: (typeof financialStages)[number]["key"],
): string {
  return financialStages.find((stage) => stage.key === key)?.label ?? "Unknown";
}
