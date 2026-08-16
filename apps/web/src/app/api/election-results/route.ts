import {
  preparedElectionResults,
  type ElectionResultCatalogResponse,
} from "@/lib/election-results";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function preparedEmpty(): ElectionResultCatalogResponse {
  return { data: [...preparedElectionResults], status: "prepared-empty" };
}

export async function GET() {
  try {
    const response = await fetch(`${API_URL}/api/v1/election-results`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!response.ok) return Response.json(preparedEmpty());
    return Response.json(
      (await response.json()) as ElectionResultCatalogResponse,
    );
  } catch {
    return Response.json(preparedEmpty());
  }
}
