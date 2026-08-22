import type { Metadata } from "next";
import { Suspense } from "react";
import { PageFooter } from "@/components/PageFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { ProfessionalAccountContent } from "./ProfessionalAccountContent";

export const metadata: Metadata = {
  title: "Professional account · Viksit Bharat??",
  description:
    "Create or sign in to a verified professional account for manually reviewed research services.",
};

export default function ProfessionalAccountPage() {
  return (
    <>
      <SiteHeader />
      <main id="main-content">
        <Suspense fallback={<p className="section shell">Loading account…</p>}>
          <ProfessionalAccountContent />
        </Suspense>
      </main>
      <PageFooter />
    </>
  );
}
