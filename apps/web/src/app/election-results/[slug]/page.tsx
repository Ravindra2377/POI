import type { Metadata } from "next";
import { preparedElectionResultBySlug } from "@/lib/election-results";
import { ElectionResultsDetail } from "../ElectionResultsDetail";

export const metadata: Metadata = {
  title: "Election Result Record · FileKholo",
  description:
    "Inspect a reviewed Andhra Pradesh election result with constituency, party and official sources.",
};

export default async function ElectionResultDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <ElectionResultsDetail
      record={preparedElectionResultBySlug(slug)}
      requestedSlug={slug}
    />
  );
}
