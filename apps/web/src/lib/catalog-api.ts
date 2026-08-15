import type {
  FeedStatus,
  GeographyRecord,
  GovernmentBodyRecord,
  PageResponse,
  PublicOfficeRecord,
  RepresentativeRecord,
} from "./catalog-types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function request<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { Accept: "application/json" },
    signal,
  });
  if (!response.ok) {
    throw new Error(`Catalog request failed with status ${response.status}`);
  }
  return (await response.json()) as T;
}

export function getDistricts(
  query: string,
  signal?: AbortSignal,
): Promise<PageResponse<GeographyRecord>> {
  const params = new URLSearchParams({
    entity_type: "district",
    page_size: "100",
  });
  if (query) params.set("q", query);
  return request(`/api/v1/geographies?${params.toString()}`, signal);
}

export function getDepartments(
  query: string,
  signal?: AbortSignal,
): Promise<PageResponse<GovernmentBodyRecord>> {
  const params = new URLSearchParams({
    body_type: "department",
    page_size: "100",
  });
  if (query) params.set("q", query);
  return request(`/api/v1/government-bodies?${params.toString()}`, signal);
}

export function getGovernmentBodies(
  query = "",
  signal?: AbortSignal,
): Promise<PageResponse<GovernmentBodyRecord>> {
  const params = new URLSearchParams({ page_size: "100" });
  if (query) params.set("q", query);
  return request(`/api/v1/government-bodies?${params.toString()}`, signal);
}

export function getPublicOffices(
  query = "",
  signal?: AbortSignal,
): Promise<PageResponse<PublicOfficeRecord>> {
  const params = new URLSearchParams({ page_size: "100" });
  if (query) params.set("q", query);
  return request(`/api/v1/public-offices?${params.toString()}`, signal);
}

export function getRepresentatives(
  query = "",
  signal?: AbortSignal,
): Promise<PageResponse<RepresentativeRecord>> {
  const params = new URLSearchParams({ page_size: "100" });
  if (query) params.set("q", query);
  return request(`/api/v1/representatives?${params.toString()}`, signal);
}

export function getIngestionFeeds(signal?: AbortSignal): Promise<FeedStatus[]> {
  return request(`/api/v1/ingestion/feeds`, signal);
}
