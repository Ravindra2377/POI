import type { Metadata } from "next";
import { preparedSchemeBySlug } from "@/lib/schemes";
import { SchemeDetail } from "../SchemeDetail";

export const metadata: Metadata = {
  title: "AP Scheme Record · Viksit Bharat??",
  description:
    "Inspect a reviewed Andhra Pradesh scheme record with bilingual claims and official sources.",
};

export default async function SchemeDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <SchemeDetail scheme={preparedSchemeBySlug(slug)} requestedSlug={slug} />
  );
}
