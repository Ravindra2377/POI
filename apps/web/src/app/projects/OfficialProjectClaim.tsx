import type { ReactNode } from "react";
import type { ProjectSourceRecord } from "@/lib/projects";
import styles from "./projects.module.css";

export function OfficialProjectClaim({
  label,
  source,
  children,
}: {
  label: string;
  source: ProjectSourceRecord;
  children: ReactNode;
}) {
  return (
    <div className={styles.claim}>
      <span className={styles.claimLabel}>{label}</span>
      <div className={styles.claimValue}>{children}</div>
      <div className={styles.provenance}>
        <span>Official · Reviewed</span>
        <a href={source.official_source_url} target="_blank" rel="noreferrer">
          {source.source_name}
        </a>
        <small>SourceRecord · retrieved {source.retrieval_date}</small>
      </div>
    </div>
  );
}
