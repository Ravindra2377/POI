"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLocale } from "@/components/LocaleProvider";
import {
  CivicRecordReference,
  followCivicRecord,
  isCivicRecordFollowed,
  subscribeCivicTracking,
  unfollowCivicRecord,
} from "@/lib/civic-tracking";
import styles from "./RecordWatchControl.module.css";

const copy = {
  en: {
    follow: "Follow this record",
    following: "Following",
    private: "Saved only on this device",
    watchlist: "View development watchlist",
  },
  te: {
    follow: "ఈ రికార్డును అనుసరించండి",
    following: "అనుసరిస్తున్నారు",
    private: "ఈ పరికరంలో మాత్రమే భద్రపరచబడింది",
    watchlist: "అభివృద్ధి వాచ్‌లిస్ట్‌ను చూడండి",
  },
} as const;

export function RecordWatchControl({
  record,
}: {
  record: CivicRecordReference;
}) {
  const { locale } = useLocale();
  const labels = locale === "te" ? copy.te : copy.en;
  const [followed, setFollowed] = useState(false);

  useEffect(() => {
    const refresh = () => setFollowed(isCivicRecordFollowed(record.id));
    refresh();
    return subscribeCivicTracking(refresh);
  }, [record.id]);

  return (
    <div className={styles.control}>
      <button
        aria-pressed={followed}
        className={`button ${followed ? styles.active : "button--primary"}`}
        type="button"
        onClick={() => {
          if (followed) unfollowCivicRecord(record);
          else followCivicRecord(record);
        }}
      >
        <span aria-hidden="true">{followed ? "✓" : "+"}</span>{" "}
        {followed ? labels.following : labels.follow}
      </button>
      <span>{labels.private}</span>
      {followed && <Link href="/lists">{labels.watchlist} →</Link>}
    </div>
  );
}
