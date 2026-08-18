import {
  preparedComparisons,
  type ComparisonCatalogResponse,
} from "@/lib/comparisons";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function preparedEmpty(): ComparisonCatalogResponse {
  return { data: [...preparedComparisons], status: "prepared-empty" };
}

export async function GET() {
  try {
    const response = await fetch(`${API_URL}/api/v1/comparisons`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!response.ok) return Response.json(preparedEmpty());
    return Response.json((await response.json()) as ComparisonCatalogResponse);
  } catch {
    return Response.json(preparedEmpty());
  }
}
