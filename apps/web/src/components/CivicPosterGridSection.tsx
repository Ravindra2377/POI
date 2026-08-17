"use client";

import Link from "next/link";
import { useState } from "react";
import { CivicPosterCard, type CivicEntityType } from "./CivicPosterCard";
import styles from "./CivicPosterGridSection.module.css";
import { LogCivicActionModal } from "./LogCivicActionModal";

interface FeaturedEntity {
  id: string;
  slug: string;
  type: CivicEntityType;
  titleEn: string;
  titleTe?: string;
  descriptionEn?: string;
  district?: string;
  detailUrl: string;
}

const FEATURED_ENTITIES: FeaturedEntity[] = [
  {
    id: "proj-polavaram",
    slug: "polavaram-irrigation-project",
    type: "project",
    titleEn: "Polavaram National Irrigation Project",
    titleTe: "పోలవరం జాతీయ నీటిపారుదల ప్రాజెక్ట్",
    descriptionEn:
      "Major multi-purpose irrigation project on the Godavari River providing drinking water, hydro power, and irrigation to 7.2 lakh acres.",
    district: "Eluru",
    detailUrl: "/projects",
  },
  {
    id: "sch-rythu-bharosa",
    slug: "dr-ysr-rythu-bharosa",
    type: "scheme",
    titleEn: "Dr. YSR Rythu Bharosa / Farmer Investment Support",
    titleTe: "డాక్టర్ వైఎస్ఆర్ రైతు భరోసా",
    descriptionEn:
      "Financial assistance of ₹13,500 per year to farmer families including tenant farmers across Andhra Pradesh.",
    district: "Andhra Pradesh",
    detailUrl: "/schemes",
  },
  {
    id: "proc-r-b-roads",
    slug: "tender-r-b-roads-kakinada-2026",
    type: "procurement",
    titleEn: "Construction & Widening of State Highway 41 (Kakinada Corridor)",
    titleTe: "రాష్ట్ర రహదారి 41 విస్తరణ మరియు నిర్మాణం",
    descriptionEn:
      "EPC tender for 42 km asphalt paving, drainage work, and bridge construction.",
    district: "Kakinada",
    detailUrl: "/procurement",
  },
  {
    id: "off-mla-guntur",
    slug: "mla-guntur-west-2024",
    type: "officeholder",
    titleEn: "Guntur West Assembly Constituency Officeholder",
    titleTe: "గుంటూరు పశ్చిమ శాసనసభ నియోజకవర్గం",
    descriptionEn:
      "16th Andhra Pradesh Legislative Assembly representative record for Guntur West.",
    district: "Guntur",
    detailUrl: "/officeholders",
  },
];

export function CivicPosterGridSection() {
  const [selectedEntity, setSelectedEntity] = useState<{
    id: string;
    title: string;
    type: CivicEntityType;
  } | null>(null);

  return (
    <section className={`${styles.section} shell`}>
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <p className={styles.eyebrow}>DISCOVER & LOG</p>
          <h2 className={styles.title}>Civic Entities & Public Records</h2>
          <p className={styles.subtitle}>
            Explore reviewed government datasets or log your own verified
            community observation.
          </p>
        </div>
        <Link href="/explore-data" className={styles.viewAllLink}>
          Explore All Datasets →
        </Link>
      </div>

      <div className={styles.grid}>
        {FEATURED_ENTITIES.map((entity) => (
          <CivicPosterCard
            key={entity.id}
            id={entity.id}
            slug={entity.slug}
            type={entity.type}
            titleEn={entity.titleEn}
            titleTe={entity.titleTe}
            descriptionEn={entity.descriptionEn}
            district={entity.district}
            detailUrl={entity.detailUrl}
            onLogAction={(e) => setSelectedEntity(e)}
          />
        ))}
      </div>

      <LogCivicActionModal
        isOpen={selectedEntity !== null}
        onClose={() => setSelectedEntity(null)}
        initialEntity={selectedEntity ?? undefined}
      />
    </section>
  );
}
