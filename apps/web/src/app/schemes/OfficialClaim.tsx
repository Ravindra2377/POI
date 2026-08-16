import type { ReactNode } from "react";
import type { SchemeSourceRecord } from "@/lib/schemes";
import styles from "./schemes.module.css";

export function OfficialClaim({
  label,
  source,
  children,
}: {
  label: string;
  source: SchemeSourceRecord;
  children: ReactNode;
}) {
  const linkUrl = source.public_source_url ?? source.official_source_url;
  return (
    <div className={styles.claim}>
      <span className={styles.claimLabel}>{label}</span>
      <div className={styles.claimValue}>{children}</div>
      <div className={styles.provenance}>
        <span>Official · Reviewed</span>
        <a href={linkUrl} target="_blank" rel="noreferrer">
          {source.source_name}
        </a>
        <small>SourceRecord · retrieved {source.retrieval_date}</small>
      </div>
    </div>
  );
}
