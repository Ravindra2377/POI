import type { Metadata } from "next";
import { preparedProjectBySlug } from "@/lib/projects";
import { ProjectDetail } from "../ProjectDetail";

export const metadata: Metadata = {
  title: "AP Project Record · Viksit Bharat??",
  description:
    "Inspect a reviewed Andhra Pradesh project record with responsibility, timeline and official sources.",
};

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <ProjectDetail project={preparedProjectBySlug(slug)} requestedSlug={slug} />
  );
}
