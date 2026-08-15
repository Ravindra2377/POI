import { preparedPublicMoney, type PublicMoneyCatalogResponse } from "@/lib/public-money";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function preparedEmpty(): PublicMoneyCatalogResponse {
  return {
    data: [...preparedPublicMoney],
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
    return Response.json((await response.json()) as PublicMoneyCatalogResponse);
  } catch {
    return Response.json(preparedEmpty());
  }
}
