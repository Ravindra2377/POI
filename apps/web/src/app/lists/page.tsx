"use client";

import { useState } from "react";
import { LogCivicActionModal } from "@/components/LogCivicActionModal";
import styles from "./lists.module.css";

interface CivicList {
  id: string;
  title: string;
  category: string;
  description: string;
  itemCount: number;
  curator: string;
  updatedAt: string;
}

const SAMPLE_LISTS: CivicList[] = [
  {
    id: "list-1",
    title: "Rayalaseema Irrigation & Water Resources Watch",
    category: "Infrastructure",
    description:
      "Tracking major multi-purpose dams, lift irrigation projects, and drinking water pipelines across Kurnool, Kadapa, Anantapur, and Chittoor.",
    itemCount: 8,
    curator: "Andhra Civic Research Group",
    updatedAt: "2026-08-15",
  },
  {
    id: "list-2",
    title: "Farmer Welfare & Agricultural Support Schemes (2024–26)",
    category: "Welfare Schemes",
    description:
      "A complete index of input subsidies, free crop insurance, borewell schemes, and soil health initiatives for AP farmers.",
    itemCount: 6,
    curator: "Rythu Welfare Watch",
    updatedAt: "2026-08-14",
  },
  {
    id: "list-3",
    title: "Amaravati Capital City Core Tenders & Infrastructure",
    category: "e-Procurement",
    description:
      "Public tender notices, contractor award records, and progress disclosures for the administrative core and ring roads.",
    itemCount: 12,
    curator: "Urban Growth Collective",
    updatedAt: "2026-08-16",
  },
  {
    id: "list-4",
    title: "Guntur & Visakhapatnam Super-Specialty Medical Upgrades",
    category: "Healthcare",
    description:
      "Diagnostic equipment procurement, GGH modernization, and medical college infrastructure projects across coastal AP.",
    itemCount: 5,
    curator: "Health Rights Forum AP",
    updatedAt: "2026-08-10",
  },
];

export default function CivicListsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <header className={styles.pageHeader}>
        <div className="shell">
          <h1 className={styles.heroTitle}>Civic Watchlists & Dossiers</h1>
          <p className={styles.heroSubtitle}>
            Curated collections of public schemes, infrastructure projects, budget heads, and tenders compiled by citizens and civic analysts.
          </p>
          <button
            type="button"
            className={styles.createListButton}
            onClick={() => setIsModalOpen(true)}
          >
            + Create New Watchlist
          </button>
        </div>
      </header>

      <main className={`${styles.mainSection} shell`}>
        <div className={styles.grid}>
          {SAMPLE_LISTS.map((list) => (
            <article key={list.id} className={styles.listCard}>
              <div>
                <span className={styles.listTag}>{list.category}</span>
                <h2 className={styles.listTitle}>{list.title}</h2>
                <p className={styles.listDesc}>{list.description}</p>
              </div>
              <div className={styles.cardFooter}>
                <span className={styles.itemCount}>{list.itemCount} items</span>
                <span className={styles.curator}>By {list.curator}</span>
              </div>
            </article>
          ))}
        </div>
      </main>

      <LogCivicActionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
