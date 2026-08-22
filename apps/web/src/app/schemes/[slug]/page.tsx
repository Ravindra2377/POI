import type { Metadata } from "next";
import type { SchemeCatalogResponse, SchemeRecord } from "@/lib/schemes";
import { ALL_INDIA_ISO } from "@/lib/states";
import { SchemeDetail } from "../SchemeDetail";

export const metadata: Metadata = {
  title: "Scheme Record · FileKholo",
  description:
    "Inspect a reviewed State/UT scheme record with bilingual claims and official sources.",
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function fetchCatalog(stateIso?: string): Promise<SchemeCatalogResponse> {
  try {
    const url = stateIso
      ? `${API_URL}/api/v1/schemes?state=${encodeURIComponent(stateIso)}`
      : `${API_URL}/api/v1/schemes`;
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!response.ok) {
      return { data: [], status: "prepared-empty", telugu_reviewed: false };
    }
    return (await response.json()) as SchemeCatalogResponse;
  } catch {
    return { data: [], status: "prepared-empty", telugu_reviewed: false };
  }
}

export default async function SchemeDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ state?: string }>;
}) {
  const { slug } = await params;
  const { state } = await searchParams;
  const catalog = await fetchCatalog(
    state === ALL_INDIA_ISO ? undefined : state,
  );
  const scheme: SchemeRecord | null =
    catalog.data.find((item) => item.slug === slug) ?? null;
  return (
    <SchemeDetail
      scheme={scheme}
      requestedSlug={slug}
      teluguReviewed={catalog.telugu_reviewed}
    />
  );
}
