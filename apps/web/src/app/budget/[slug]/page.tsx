import type { Metadata } from "next";
import { preparedBudgetLineBySlug } from "@/lib/budget";
import { BudgetDetail } from "../BudgetDetail";

export const metadata: Metadata = {
  title: "Budget Line Record · Viksit Bharat??",
  description:
    "Inspect a reviewed Andhra Pradesh budget major head with budget estimate, amount columns and official sources.",
};

export default async function BudgetDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <BudgetDetail line={preparedBudgetLineBySlug(slug)} requestedSlug={slug} />
  );
}
