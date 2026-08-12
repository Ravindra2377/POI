import type { Metadata } from "next";
import { PageFooter } from "@/components/PageFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { SourcesDirectory } from "./SourcesDirectory";

export const metadata: Metadata = {
  title: "Sources and Methodology · Viksit Bharat??",
  description:
    "Understand evidence classes, current coverage and source-linked Stage 1 records.",
};

export default function SourcesPage() {
  return (
    <>
      <SiteHeader />
      <main id="main-content">
        <header className="page-intro shell">
          <p className="eyebrow">SOURCES & METHODOLOGY</p>
          <h1>Every claim should show where it came from.</h1>
          <p className="lede">
            The public interface labels what government reported, what the
            platform calculated or inferred, and what a community participant
            reported.
          </p>
        </header>
        <SourcesDirectory />
      </main>
      <PageFooter />
    </>
  );
}
