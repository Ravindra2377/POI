import Link from "next/link";
import { CivicPosterGridSection } from "@/components/CivicPosterGridSection";
import { CoverageFacts } from "@/components/CoverageFacts";
import { LatestRecordUpdates } from "@/components/LatestRecordUpdates";
import { PageFooter } from "@/components/PageFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { UniversalRecordSearch } from "@/components/UniversalRecordSearch";

const quickLinks = [
  {
    label: "Andhra Pradesh",
    href: "/government-explorer",
    note: "28 Districts Verified",
  },
  {
    label: "Public Schemes",
    href: "/schemes",
    note: "20 AP Schemes Live",
  },
  {
    label: "Public Money & Budget",
    href: "/public-money",
    note: "32,528 AFS Observations",
  },
  {
    label: "Data Ingestion",
    href: "/ingestion",
    note: "100% Provenance Audit",
  },
  {
    label: "Official Sources",
    href: "/sources",
    note: "Raw PDF & JSON Feeds",
  },
];

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main id="main-content">
        <section className="home-intro shell">
          <p className="eyebrow">INDIA&apos;S PUBLIC INFORMATION, CONNECTED</p>
          <h1>Government records. One place to check.</h1>
          <p className="lede">
            Search schemes, projects, spending, departments and responsible
            officeholders—from the Union government to a state and district.
            Andhra Pradesh is the first reviewed dataset.
          </p>
          <p className="satirical-context">
            Because development is a claim until the public can inspect the
            record.
          </p>
          <UniversalRecordSearch />
          <nav className="quick-links" aria-label="Quick record links">
            {quickLinks.map((item) => (
              <Link href={item.href} key={item.label}>
                <span>{item.label}</span>
                <small>{item.note}</small>
              </Link>
            ))}
          </nav>
        </section>
        <CivicPosterGridSection />
        <CoverageFacts />
        <section className="section shell" aria-labelledby="latest-heading">
          <div className="section-heading section-heading--split">
            <div>
              <p className="eyebrow">RECENT PUBLIC RECORDS</p>
              <h2 id="latest-heading">Latest reviewed updates</h2>
            </div>
            <p>
              Retrieved dates from current Stage 1 source-linked records—not a
              claim that the underlying government data changed on that date.
            </p>
          </div>
          <LatestRecordUpdates />
        </section>
        <section className="section section--tinted">
          <div className="shell evidence-intro">
            <div>
              <p className="eyebrow">READ THE LABEL</p>
              <h2>Evidence stays in its lane.</h2>
            </div>
            <div className="classification-grid">
              <article>
                <span className="classification-mark" data-kind="official" />
                <h3>Official</h3>
                <p>
                  Published by an identified government authority and linked to
                  its source.
                </p>
              </article>
              <article>
                <span className="classification-mark" data-kind="calculated" />
                <h3>Calculated</h3>
                <p>
                  A reproducible platform calculation from cited official
                  observations.
                </p>
              </article>
              <article>
                <span className="classification-mark" data-kind="inferred" />
                <h3>Inferred</h3>
                <p>
                  A platform interpretation with uncertainty and review state
                  shown.
                </p>
              </article>
              <article>
                <span className="classification-mark" data-kind="community" />
                <h3>Community-reported</h3>
                <p>
                  Structured public experience, never silently presented as
                  official fact.
                </p>
              </article>
            </div>
          </div>
        </section>
      </main>
      <PageFooter />
    </>
  );
}
