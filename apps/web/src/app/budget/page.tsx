import type { Metadata } from "next";
import { BudgetDirectory } from "./BudgetDirectory";

export const metadata: Metadata = {
  title: "Budget · FileKholo",
  description:
    "Browse reviewed Andhra Pradesh Annual Financial Statement major heads with official sources.",
};

export default function BudgetPage() {
  return <BudgetDirectory />;
}
