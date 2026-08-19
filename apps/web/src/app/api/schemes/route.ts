import { preparedSchemes, type SchemeCatalogResponse } from "@/lib/schemes";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function preparedEmpty(): SchemeCatalogResponse {
  return {
    data: [...preparedSchemes],
    status: "prepared-empty",
    telugu_reviewed: false,
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const state = searchParams.get("state");
  try {
    const url = state
      ? `${API_URL}/api/v1/schemes?state=${encodeURIComponent(state)}`
      : `${API_URL}/api/v1/schemes`;
    const response = await fetch(url, {
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
