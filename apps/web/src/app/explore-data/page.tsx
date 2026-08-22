import type { Metadata } from "next";
import { Suspense } from "react";
import { PageFooter } from "@/components/PageFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { ExploreData } from "./ExploreData";

export const metadata: Metadata = {
  title: "Explore Data · FileKholo",
  description:
    "Browse India-wide coverage structure and reviewed district records for all 36 States and Union Territories.",
};

export default function ExploreDataPage() {
  return (
    <>
      <SiteHeader />
      <main id="main-content">
        <Suspense
          fallback={
            <div className="page-state" role="status">
              Loading data directories…
            </div>
          }
        >
          <ExploreData />
        </Suspense>
      </main>
      <PageFooter />
    </>
  );
}
