import type { Metadata } from "next";
import { ProjectsDirectory } from "./ProjectsDirectory";

export const metadata: Metadata = {
  title: "AP Projects · Viksit Bharat??",
  description:
    "Browse reviewed, bilingual and source-backed Andhra Pradesh public project records.",
};

export default function ProjectsPage() {
  return <ProjectsDirectory />;
}
