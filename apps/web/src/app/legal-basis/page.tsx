import type { Metadata } from "next";
import { PageFooter } from "@/components/PageFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { LegalBasisContent } from "./LegalBasisContent";

export const metadata: Metadata = {
  title: "Legal & Constitutional Basis · FileKholo",
  description:
    "The constitutional rights, statutory framework and responsibilities that guide this independent civic public-record platform.",
};

export default function LegalBasisPage() {
  return (
    <>
      <SiteHeader />
      <main id="main-content">
        <LegalBasisContent />
      </main>
      <PageFooter />
    </>
  );
}
