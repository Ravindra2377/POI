import Link from "next/link";
import styles from "./CivicPosterGridSection.module.css";

const REVIEWED_DIRECTORIES = [
  {
    href: "/schemes",
    label: "Schemes",
    code: "SCM",
    note: "Benefits, eligibility and sources",
    tone: "green",
  },
  {
    href: "/projects",
    label: "Projects",
    code: "PRJ",
    note: "Milestones, timelines and claims",
    tone: "blue",
  },
  {
    href: "/public-money",
    label: "Public money",
    code: "₹",
    note: "Allocations through outcomes",
    tone: "orange",
  },
  {
    href: "/procurement",
    label: "Procurement",
    code: "CTR",
    note: "Contracts and award records",
    tone: "violet",
  },
  {
    href: "/officeholders",
    label: "Officeholders",
    code: "WHO",
    note: "Roles, terms and authority",
    tone: "slate",
  },
  {
    href: "/election-results",
    label: "Elections",
    code: "VOTE",
    note: "Reviewed result records",
    tone: "red",
  },
] as const;

export function CivicPosterGridSection() {
  return (
    <section className={`${styles.section} shell`}>
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <p className={styles.eyebrow}>DISCOVER REVIEWED RECORDS</p>
          <h2 className={styles.title}>Browse the public record</h2>
          <p className={styles.subtitle}>
            Choose a shelf, open a reviewed record and follow what matters to
            your civic life.
          </p>
        </div>
        <Link href="/explore-data" className={styles.viewAllLink}>
          Explore All Datasets →
        </Link>
      </div>

      <nav
        className={styles.grid}
        aria-label="Reviewed public-data directories"
      >
        {REVIEWED_DIRECTORIES.map((directory) => (
          <Link
            key={directory.href}
            href={directory.href}
            className={styles.poster}
            data-tone={directory.tone}
          >
            <span className={styles.posterCode}>{directory.code}</span>
            <span className={styles.posterBody}>
              <strong>{directory.label}</strong>
              <small>{directory.note}</small>
              <span>Open directory →</span>
            </span>
          </Link>
        ))}
      </nav>
    </section>
  );
}
