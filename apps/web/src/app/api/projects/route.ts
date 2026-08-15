import { preparedProjects, type ProjectCatalogResponse } from "@/lib/projects";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function preparedEmpty(): ProjectCatalogResponse {
  return {
    data: [...preparedProjects],
    status: "prepared-empty",
  };
}

export async function GET() {
  try {
    const response = await fetch(`${API_URL}/api/v1/projects`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!response.ok) {
      return Response.json(preparedEmpty());
    }
    return Response.json((await response.json()) as ProjectCatalogResponse);
  } catch {
    return Response.json(preparedEmpty());
  }
}
