import type { Metadata } from "next";
import { PageFooter } from "@/components/PageFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { GovernmentDirectory } from "./GovernmentDirectory";

export const metadata: Metadata = {
  title: "Government Directory · FileKholo",
  description:
    "Browse source-linked government bodies, offices and time-bound representatives.",
};

export default function GovernmentPage() {
  return (
    <>
      <SiteHeader />
      <main id="main-content">
        <header className="page-intro shell">
          <p className="eyebrow">GOVERNMENT DIRECTORY</p>
          <h1>Institutions, offices and time-bound officeholders.</h1>
          <p className="lede">
            Government organisations are durable records. Ministers and
            representatives are shown only for a sourced term with explicit
            validity dates.
          </p>
        </header>
        <GovernmentDirectory />
      </main>
      <PageFooter />
    </>
  );
}
