import type { Metadata } from "next";
import { CivicTrackingCollection } from "@/components/CivicTrackingCollection";
import { PageFooter } from "@/components/PageFooter";
import { SiteHeader } from "@/components/SiteHeader";
import styles from "./activity.module.css";

export const metadata: Metadata = {
  title: "Private Civic Diary · Viksit Bharat??",
  description:
    "A device-private history of reviewed development and political records followed on this browser.",
};

export default function CivicActivityPage() {
  return (
    <>
      <SiteHeader />
      <main id="main-content" className={`${styles.mainSection} shell`}>
        <CivicTrackingCollection mode="diary" />
      </main>
      <PageFooter />
    </>
  );
}
