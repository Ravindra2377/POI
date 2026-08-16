"use client";

import Link from "next/link";
import styles from "./CivicPosterCard.module.css";

export type CivicEntityType =
  | "scheme"
  | "project"
  | "officeholder"
  | "procurement"
  | "budget";

export interface CivicPosterCardProps {
  id: string;
  slug: string;
  type: CivicEntityType;
  titleEn: string;
  titleTe?: string;
  descriptionEn?: string;
  district?: string;
  detailUrl: string;
  sourceName?: string;
  retrievalDate?: string;
  isCommunityReported?: boolean;
  onLogAction?: (entity: { id: string; title: string; type: CivicEntityType }) => void;
}

const TYPE_LABELS: Record<CivicEntityType, { en: string; icon: string; headerClass: string }> = {
  scheme: { en: "Scheme", icon: "🏛️", headerClass: styles.schemeHeader },
  project: { en: "Project", icon: "🏗️", headerClass: styles.projectHeader },
  officeholder: { en: "Officeholder", icon: "👤", headerClass: styles.officeholderHeader },
  procurement: { en: "Tender", icon: "📜", headerClass: styles.procurementHeader },
  budget: { en: "Budget Line", icon: "💰", headerClass: styles.budgetHeader },
};

export function CivicPosterCard({
  id,
  type,
  titleEn,
  titleTe,
  descriptionEn,
  district = "Andhra Pradesh",
  detailUrl,
  isCommunityReported = false,
  onLogAction,
}: CivicPosterCardProps) {
  const meta = TYPE_LABELS[type] ?? TYPE_LABELS.scheme;

  return (
    <div className={styles.posterCard}>
      <Link href={detailUrl} className={styles.posterHeader + " " + meta.headerClass}>
        <div className={styles.headerTop}>
          <span className={styles.typeBadge}>{meta.en}</span>
          <span className={styles.districtBadge}>{district}</span>
        </div>
        <div className={styles.headerBottom}>
          <span className={styles.iconCircle}>{meta.icon}</span>
        </div>
      </Link>
      <div className={styles.posterBody}>
        <Link href={detailUrl} style={{ textDecoration: "none" }}>
          <h3 className={styles.titleEn}>{titleEn}</h3>
          {titleTe && <p className={styles.titleTe}>{titleTe}</p>}
        </Link>
        {descriptionEn && <p className={styles.description}>{descriptionEn}</p>}
      </div>
      <div className={styles.posterFooter}>
        {isCommunityReported ? (
          <span className={`${styles.provenanceTag} ${styles.communityTag}`}>
            <span className={`${styles.provenanceDot} ${styles.communityDot}`} />
            Community Reported
          </span>
        ) : (
          <span className={styles.provenanceTag}>
            <span className={styles.provenanceDot} />
            Official · Reviewed
          </span>
        )}
        {onLogAction && (
          <button
            type="button"
            className={styles.logButton}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onLogAction({ id, title: titleEn, type });
            }}
          >
            + Log
          </button>
        )}
      </div>
    </div>
  );
}
