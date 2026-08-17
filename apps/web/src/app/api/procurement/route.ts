import {
  preparedProcurement,
  type ProcurementCatalogResponse,
} from "@/lib/procurement";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function preparedEmpty(): ProcurementCatalogResponse {
  return {
    data: [...preparedProcurement],
    status: "prepared-empty",
  };
}

export async function GET() {
  try {
    const response = await fetch(`${API_URL}/api/v1/procurement`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!response.ok) {
      return Response.json(preparedEmpty());
    }
    return Response.json((await response.json()) as ProcurementCatalogResponse);
  } catch {
    return Response.json(preparedEmpty());
  }
}
