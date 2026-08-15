import type { Metadata } from "next";
import type { SchemeCatalogResponse, SchemeRecord } from "@/lib/schemes";
import { SchemeDetail } from "../SchemeDetail";

export const metadata: Metadata = {
  title: "AP Scheme Record · Viksit Bharat??",
  description:
    "Inspect a reviewed Andhra Pradesh scheme record with bilingual claims and official sources.",
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function fetchCatalog(): Promise<SchemeCatalogResponse> {
  try {
    const response = await fetch(`${API_URL}/api/v1/schemes`, {
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
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const catalog = await fetchCatalog();
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
