import { preparedOfficeholders, type OfficeholderCatalogResponse } from "@/lib/officeholders";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function preparedEmpty(): OfficeholderCatalogResponse {
  return {
    data: [...preparedOfficeholders],
    status: "prepared-empty",
  };
}

export async function GET() {
  try {
    const response = await fetch(`${API_URL}/api/v1/officeholders`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!response.ok) {
      return Response.json(preparedEmpty());
    }
    return Response.json((await response.json()) as OfficeholderCatalogResponse);
  } catch {
    return Response.json(preparedEmpty());
  }
}
