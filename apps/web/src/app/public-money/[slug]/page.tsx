import type { Metadata } from "next";
import { preparedMoneyBySlug } from "@/lib/public-money";
import { PublicMoneyDetail } from "../PublicMoneyDetail";

export const metadata: Metadata = {
  title: "Public Money Record · Viksit Bharat??",
  description:
    "Inspect a reviewed Andhra Pradesh public-money observation with stage, amount and official sources.",
};

export default async function PublicMoneyDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <PublicMoneyDetail
      record={preparedMoneyBySlug(slug)}
      requestedSlug={slug}
    />
  );
}
