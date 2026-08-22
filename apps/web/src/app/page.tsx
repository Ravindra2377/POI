import Link from "next/link";
import { CivicHomeStatus } from "@/components/CivicHomeStatus";
import { CivicPosterGridSection } from "@/components/CivicPosterGridSection";
import { CoverageFacts } from "@/components/CoverageFacts";
import { DevelopmentSocialIntro } from "@/components/DevelopmentSocialIntro";
import { LatestRecordUpdates } from "@/components/LatestRecordUpdates";
import { PageFooter } from "@/components/PageFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { UniversalRecordSearch } from "@/components/UniversalRecordSearch";
import styles from "./home.module.css";

const quickLinks = [
  {
    label: "All 36 States & UTs",
    href: "/states",
    note: "Reviewed district records live",
  },
  {
    label: "District Explorer",
    href: "/geographies",
    note: "784 Districts Verified",
  },
  {
    label: "Andhra Pradesh",
    href: "/government-explorer",
    note: "First fully reviewed dataset",
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
        <section className={styles.hero}>
          <div className={`shell ${styles.heroGrid}`}>
            <div className={styles.heroCopy}>
              <p className="eyebrow">INDIA&apos;S CIVIC DISCOVERY NETWORK</p>
              <h1>Track the work. Keep the receipts.</h1>
              <p className="lede">
                Discover source-linked schemes, projects, public money,
                procurement, elections and officeholders. Follow reviewed
                records and build a private diary of the India you are watching.
              </p>
              <p className={styles.boundary}>
                Official records stay official. Community experience stays
                labelled. Your watchlist stays on this device.
              </p>
              <div className={styles.heroActions}>
                <Link className="button button--primary" href="/explore-data">
                  Discover records <span aria-hidden="true">→</span>
                </Link>
                <Link className={styles.textLink} href="/lists">
                  View my watchlist
                </Link>
              </div>
            </div>
            <CivicHomeStatus />
          </div>
          <div className={`shell ${styles.searchWrap}`}>
            <UniversalRecordSearch />
          </div>
          <nav
            className={`shell ${styles.quickLinks}`}
            aria-label="Quick record links"
          >
            {quickLinks.map((item) => (
              <Link href={item.href} key={item.label}>
                <span>{item.label}</span>
                <small>{item.note}</small>
              </Link>
            ))}
          </nav>
        </section>
        <CivicPosterGridSection />
        <DevelopmentSocialIntro />
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
