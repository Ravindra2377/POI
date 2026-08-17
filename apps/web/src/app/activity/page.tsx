"use client";

import Link from "next/link";
import { useState } from "react";
import { LogCivicActionModal } from "@/components/LogCivicActionModal";
import styles from "./activity.module.css";

interface ActivityItem {
  id: string;
  actor: string;
  avatar: string;
  actionVerb: string;
  targetTitle: string;
  targetUrl: string;
  targetType: string;
  district: string;
  notes?: string;
  timestamp: string;
  isOfficial: boolean;
}

const SAMPLE_ACTIVITY: ActivityItem[] = [
  {
    id: "act-1",
    actor: "Official AP Ingestion Pipeline",
    avatar: "🏛️",
    actionVerb: "ingested new e-Procurement contract award",
    targetTitle:
      "Construction & Widening of State Highway 41 (Kakinada Corridor)",
    targetUrl: "/procurement",
    targetType: "Tender",
    district: "Kakinada",
    notes:
      "EPC contract awarded. Raw snapshot archived & observations reviewed.",
    timestamp: "2 hours ago",
    isOfficial: true,
  },
  {
    id: "act-2",
    actor: "K. Satyanarayana",
    avatar: "👤",
    actionVerb: "logged field observation for",
    targetTitle: "Polavaram National Irrigation Project",
    targetUrl: "/projects",
    targetType: "Project",
    district: "Eluru",
    notes:
      "Canal concrete lining work underway near Right Main Canal Section 4. Progress verified in field.",
    timestamp: "4 hours ago",
    isOfficial: false,
  },
  {
    id: "act-3",
    actor: "Official AP Budget Feed",
    avatar: "💰",
    actionVerb: "published updated budget head disbursement",
    targetTitle: "Education, Sports, Art & Culture — Secondary Education",
    targetUrl: "/public-money",
    targetType: "Budget Line",
    district: "Andhra Pradesh",
    notes: "Major Head 2202 updated with reviewed expenditure observations.",
    timestamp: "6 hours ago",
    isOfficial: true,
  },
  {
    id: "act-4",
    actor: "Rythu Civic Group",
    avatar: "🌾",
    actionVerb: "logged scheme interaction for",
    targetTitle: "Dr. YSR Rythu Bharosa / Farmer Input Support",
    targetUrl: "/schemes",
    targetType: "Scheme",
    district: "Guntur",
    notes:
      "Direct benefit transfer received by 142 registered farmers in Guntur revenue division.",
    timestamp: "12 hours ago",
    isOfficial: false,
  },
];

export default function CivicActivityPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <header className={styles.pageHeader}>
        <div className="shell">
          <h1 className={styles.heroTitle}>Civic Activity Stream</h1>
          <p className={styles.heroSubtitle}>
            Live updates combining official state data ingestion feeds with
            audited community observations across Andhra Pradesh.
          </p>
          <button
            type="button"
            className={styles.actionButton}
            onClick={() => setIsModalOpen(true)}
          >
            + Log Civic Action
          </button>
        </div>
      </header>

      <main className={`${styles.mainSection} shell`}>
        <div className={styles.activityFeed}>
          {SAMPLE_ACTIVITY.map((item) => (
            <article key={item.id} className={styles.feedItem}>
              <div className={styles.avatarCircle}>{item.avatar}</div>
              <div className={styles.itemContent}>
                <div className={styles.itemHeader}>
                  <div>
                    <span className={styles.actorName}>{item.actor}</span>{" "}
                    <span className={styles.actionVerb}>{item.actionVerb}</span>
                  </div>
                  <span className={styles.timestamp}>{item.timestamp}</span>
                </div>
                <Link href={item.targetUrl} className={styles.targetTitle}>
                  {item.targetTitle}
                </Link>
                {item.notes && <p className={styles.itemNotes}>{item.notes}</p>}
                <div className={styles.badgeGroup}>
                  {item.isOfficial ? (
                    <span className={styles.officialBadge}>Official Feed</span>
                  ) : (
                    <span className={styles.communityBadge}>
                      Community Reported
                    </span>
                  )}
                  <span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>
                    • {item.district}
                  </span>
                </div>
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
