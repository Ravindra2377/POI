import type { ReactNode } from "react";
import type { MoneySourceRecord } from "@/lib/public-money";
import styles from "./public-money.module.css";

function formatUrlDisplay(url: string) {
  try {
    const parsed = new URL(url);
    const path =
      parsed.pathname.length > 25
        ? parsed.pathname.slice(0, 25) + "…"
        : parsed.pathname;
    return `${parsed.hostname}${path}`;
  } catch {
    return url.length > 40 ? url.slice(0, 40) + "…" : url;
  }
}

export function OfficialMoneyClaim({
  label,
  source,
  children,
}: {
  label: string;
  source: MoneySourceRecord;
  children: ReactNode;
}) {
  const linkUrl = source.public_source_url ?? source.official_source_url;
  const showsRecordedEndpoint =
    source.public_source_url &&
    source.public_source_url !== source.official_source_url;
  return (
    <div className={styles.claim}>
      <span className={styles.claimLabel}>{label}</span>
      <div className={styles.claimValue}>{children}</div>
      <div className={styles.provenance}>
        <span>Official · Reviewed</span>
        <a href={linkUrl} target="_blank" rel="noreferrer">
          {source.source_name}
        </a>
        {showsRecordedEndpoint && (
          <small title={source.official_source_url}>
            Recorded from: {formatUrlDisplay(source.official_source_url)}
          </small>
        )}
        <small>SourceRecord · retrieved {source.retrieval_date}</small>
      </div>
    </div>
  );
}
