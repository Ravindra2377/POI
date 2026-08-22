import type { Metadata } from "next";
import { CivicTrackingCollection } from "@/components/CivicTrackingCollection";
import { PageFooter } from "@/components/PageFooter";
import { SiteHeader } from "@/components/SiteHeader";
import styles from "./lists.module.css";

export const metadata: Metadata = {
  title: "Development Watchlist · Viksit Bharat??",
  description:
    "A device-private watchlist for reviewed schemes, projects, public money, procurement, officeholders and election records.",
};

export default function CivicListsPage() {
  return (
    <>
      <SiteHeader />
      <main id="main-content" className={`${styles.mainSection} shell`}>
        <CivicTrackingCollection mode="watchlist" />
      </main>
      <PageFooter />
    </>
  );
}
