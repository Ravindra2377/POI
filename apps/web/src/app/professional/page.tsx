import type { Metadata } from "next";
import { PageFooter } from "@/components/PageFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { ProfessionalOffering } from "./ProfessionalOffering";

export const metadata: Metadata = {
  title: "Professional services · FileKholo",
  description:
    "Source-linked research pilots for journalists, researchers, nonprofits and public-interest teams, while public civic records remain free.",
};

export default function ProfessionalPage() {
  return (
    <>
      <SiteHeader />
      <main id="main-content">
        <ProfessionalOffering />
      </main>
      <PageFooter />
    </>
  );
}
