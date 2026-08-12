import type { Metadata } from "next";
import { FinancialStageSelector } from "@/components/FinancialStageSelector";
import { PageFooter } from "@/components/PageFooter";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "Public Money · Viksit Bharat??",
  description:
    "Inspect public-money stages without collapsing promises, spending and outcomes.",
};

export default function PublicMoneyPage() {
  return (
    <>
      <SiteHeader />
      <main id="main-content">
        <header className="page-intro shell">
          <p className="eyebrow">PUBLIC MONEY</p>
          <h1>Follow the record, not one misleading total.</h1>
          <p className="lede">
            Each financial and delivery stage has a different meaning, reporting
            date and source. This interface will display them separately when
            reviewed records are available.
          </p>
        </header>
        <section className="money-rules">
          <div className="shell money-rules__grid">
            <strong>Announcement is not expenditure.</strong>
            <strong>Contract value is not outcome.</strong>
          </div>
        </section>
        <section
          className="section shell"
          aria-labelledby="money-stages-heading"
        >
          <div className="section-heading section-heading--split">
            <div>
              <p className="eyebrow">FINANCIAL CHAIN</p>
              <h2 id="money-stages-heading">Eleven stages, kept distinct</h2>
            </div>
            <p>
              Stage 1 contains no finance observations. No demonstration amount
              is presented as production data.
            </p>
          </div>
          <FinancialStageSelector />
        </section>
        <section className="section shell">
          <div className="empty-state">
            <h3>Reviewed public-money records are not yet published</h3>
            <p>
              Finance tables, projects, procurement and ingestion remain future
              bounded stages. This is the approved presentation contract only.
            </p>
          </div>
        </section>
      </main>
      <PageFooter />
    </>
  );
}
