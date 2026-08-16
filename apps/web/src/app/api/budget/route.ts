import { preparedBudget, type BudgetCatalogResponse } from "@/lib/budget";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function preparedEmpty(): BudgetCatalogResponse {
  return {
    data: [...preparedBudget],
    status: "prepared-empty",
  };
}

export async function GET() {
  try {
    const response = await fetch(`${API_URL}/api/v1/budget`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!response.ok) {
      return Response.json(preparedEmpty());
    }
    return Response.json((await response.json()) as BudgetCatalogResponse);
  } catch {
    return Response.json(preparedEmpty());
  }
}
