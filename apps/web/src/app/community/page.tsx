import type { Metadata } from "next";
import { PageFooter } from "@/components/PageFooter";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "Community · Viksit Bharat??",
  description:
    "Prepared structure for future evidence-based civic participation.",
};

export default function CommunityPage() {
  return (
    <>
      <SiteHeader />
      <main id="main-content">
        <header className="page-intro shell">
          <p className="eyebrow">COMMUNITY RECORD</p>
          <h1>Public experience, clearly separate from official fact.</h1>
          <p className="lede">
            Future structured reports and transparent polls will be attached to
            specific projects, schemes, services and places—not an endless
            political feed.
          </p>
        </header>
        <section className="section shell">
          <div className="empty-state">
            <h2>Community participation is not yet open</h2>
            <p>
              Identity, consent, private evidence, moderation, appeals and abuse
              controls must be implemented before public submissions. No poll
              result here represents India or Andhra Pradesh.
            </p>
          </div>
        </section>
      </main>
      <PageFooter />
    </>
  );
}
