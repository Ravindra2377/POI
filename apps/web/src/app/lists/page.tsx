import Link from "next/link";
import styles from "./lists.module.css";

export default function CivicListsPage() {
  return (
    <>
      <header className={styles.pageHeader}>
        <div className="shell">
          <p className="eyebrow">READ-ONLY PUBLIC DATA BETA</p>
          <h1 className={styles.heroTitle}>Civic Watchlists &amp; Dossiers</h1>
          <p className={styles.heroSubtitle}>
            Curated collections will appear only after their records,
            provenance, and curator disclosures are reviewed.
          </p>
        </div>
      </header>

      <main className={`${styles.mainSection} shell`}>
        <section className="card" aria-labelledby="lists-empty-heading">
          <h2 id="lists-empty-heading">
            No reviewed civic watchlists are published yet
          </h2>
          <p>
            The previous demonstration collections have been removed from the
            production path. Creating public watchlists remains disabled during
            the read-only beta.
          </p>
          <Link href="/explore-data" className="button button--secondary">
            Explore reviewed datasets →
          </Link>
        </section>
      </main>
    </>
  );
}
