"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLocale } from "@/components/LocaleProvider";
import {
  readCivicTracking,
  subscribeCivicTracking,
} from "@/lib/civic-tracking";
import styles from "./CivicHomeStatus.module.css";

const copy = {
  en: {
    eyebrow: "MY CIVIC SHELF",
    title: "Pick up where you left off.",
    private: "Private on this device",
    records: "records followed",
    moments: "diary moments",
    watchlist: "Open watchlist",
    diary: "Open civic diary",
    empty: "Follow a reviewed record to start your shelf.",
  },
  te: {
    eyebrow: "నా పౌర షెల్ఫ్",
    title: "మీరు ఆపిన చోటు నుంచి కొనసాగించండి.",
    private: "ఈ పరికరంలో ప్రైవేట్",
    records: "అనుసరిస్తున్న రికార్డులు",
    moments: "డైరీ నమోదులు",
    watchlist: "వాచ్‌లిస్ట్ తెరవండి",
    diary: "పౌర డైరీ తెరవండి",
    empty: "మీ షెల్ఫ్‌ను ప్రారంభించడానికి సమీక్షించిన రికార్డును అనుసరించండి.",
  },
} as const;

export function CivicHomeStatus() {
  const { locale } = useLocale();
  const labels = locale === "te" ? copy.te : copy.en;
  const [counts, setCounts] = useState({ records: 0, diary: 0 });

  useEffect(() => {
    const refresh = () => {
      const state = readCivicTracking();
      setCounts({ records: state.watchlist.length, diary: state.diary.length });
    };
    refresh();
    return subscribeCivicTracking(refresh);
  }, []);

  return (
    <aside className={styles.panel} aria-labelledby="civic-shelf-title">
      <div className={styles.heading}>
        <p>{labels.eyebrow}</p>
        <span>{labels.private}</span>
      </div>
      <h2 id="civic-shelf-title">{labels.title}</h2>
      <dl>
        <div>
          <dt>{labels.records}</dt>
          <dd>{counts.records}</dd>
        </div>
        <div>
          <dt>{labels.moments}</dt>
          <dd>{counts.diary}</dd>
        </div>
      </dl>
      {counts.records === 0 && <p className={styles.empty}>{labels.empty}</p>}
      <nav aria-label={labels.eyebrow}>
        <Link href="/lists">{labels.watchlist} →</Link>
        <Link href="/activity">{labels.diary} →</Link>
      </nav>
    </aside>
  );
}
