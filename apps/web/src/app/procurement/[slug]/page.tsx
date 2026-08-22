import type { Metadata } from "next";
import { preparedProcurementBySlug } from "@/lib/procurement";
import { ProcurementDetail } from "../ProcurementDetail";

export const metadata: Metadata = {
  title: "Procurement Record · FileKholo",
  description:
    "Inspect a reviewed Andhra Pradesh tender or contract observation with stage, contractor and official sources.",
};

export default async function ProcurementDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <ProcurementDetail
      record={preparedProcurementBySlug(slug)}
      requestedSlug={slug}
    />
  );
}
