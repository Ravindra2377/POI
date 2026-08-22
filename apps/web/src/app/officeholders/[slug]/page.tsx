import type { Metadata } from "next";
import { preparedOfficeholderBySlug } from "@/lib/officeholders";
import { OfficeholderDetail } from "../OfficeholderDetail";

export const metadata: Metadata = {
  title: "Officeholder Record · FileKholo",
  description:
    "Inspect a reviewed Andhra Pradesh role or term with dates, office and official sources.",
};

export default async function OfficeholderDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <OfficeholderDetail
      record={preparedOfficeholderBySlug(slug)}
      requestedSlug={slug}
    />
  );
}
