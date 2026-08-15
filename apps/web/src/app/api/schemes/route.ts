import { preparedSchemes, type SchemeCatalogResponse } from "@/lib/schemes";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function preparedEmpty(): SchemeCatalogResponse {
  return {
    data: [...preparedSchemes],
    status: "prepared-empty",
    telugu_reviewed: false,
  };
}

export async function GET() {
  try {
    const response = await fetch(`${API_URL}/api/v1/schemes`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!response.ok) {
      return Response.json(preparedEmpty());
    }
    return Response.json((await response.json()) as SchemeCatalogResponse);
  } catch {
    return Response.json(preparedEmpty());
  }
}
