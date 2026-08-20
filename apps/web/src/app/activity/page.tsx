import Link from "next/link";
import styles from "./activity.module.css";

export default function CivicActivityPage() {
  return (
    <>
      <header className={styles.pageHeader}>
        <div className="shell">
          <p className="eyebrow">READ-ONLY PUBLIC DATA BETA</p>
          <h1 className={styles.heroTitle}>Civic Activity Stream</h1>
          <p className={styles.heroSubtitle}>
            Reviewed official updates and approved community observations will
            appear here only after their source and publication checks pass.
          </p>
        </div>
      </header>

      <main className={`${styles.mainSection} shell`}>
        <section className="card" aria-labelledby="activity-empty-heading">
          <h2 id="activity-empty-heading">
            No reviewed activity entries are published yet
          </h2>
          <p>
            The previous demonstration feed has been removed from the production
            path. Citizen submissions are temporarily closed, and this page does
            not fabricate official or community activity.
          </p>
          <Link
            href="/community/moderation-log"
            className="button button--secondary"
          >
            View moderation transparency →
          </Link>
        </section>
      </main>
    </>
  );
}
