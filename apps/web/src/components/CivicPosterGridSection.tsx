import Link from "next/link";
import styles from "./CivicPosterGridSection.module.css";

const REVIEWED_DIRECTORIES = [
  { href: "/schemes", label: "Schemes" },
  { href: "/projects", label: "Projects" },
  { href: "/procurement", label: "Procurement" },
  { href: "/officeholders", label: "Officeholders" },
] as const;

export function CivicPosterGridSection() {
  return (
    <section className={`${styles.section} shell`}>
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <p className={styles.eyebrow}>DISCOVER REVIEWED RECORDS</p>
          <h2 className={styles.title}>Civic Entities &amp; Public Records</h2>
          <p className={styles.subtitle}>
            Open a source-aware directory. Each directory shows its reviewed
            coverage and honest empty states.
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
          <Link key={directory.href} href={directory.href} className="card">
            <strong>{directory.label}</strong>
            <p>Browse reviewed records and their source provenance →</p>
          </Link>
        ))}
      </nav>
    </section>
  );
}
