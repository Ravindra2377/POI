"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLocale } from "@/components/LocaleProvider";
import {
  CivicDiaryEntry,
  CivicTrackedRecord,
  clearCivicDiary,
  readCivicTracking,
  subscribeCivicTracking,
  unfollowCivicRecord,
} from "@/lib/civic-tracking";
import styles from "./CivicTrackingCollection.module.css";

const copy = {
  en: {
    private: "PRIVATE · THIS DEVICE ONLY",
    watchTitle: "My files",
    watchNav: "My files",
    diaryNav: "Activity",
    discoverNav: "Discover",
    watchIntro:
      "Follow reviewed records without creating an identity or sending your interests to the server.",
    watchEmpty: "No files followed yet",
    watchEmptyText:
      "Open a reviewed scheme, project, public-money, procurement, officeholder or election record and select Follow this record.",
    diaryTitle: "Your activity",
    diaryIntro:
      "A private activity history of records followed or removed on this browser. It is not a public feed or political-preference profile.",
    diaryEmpty: "No local activity yet",
    diaryEmptyText:
      "Following a reviewed record creates the first device-private activity entry.",
    followed: "Followed",
    removed: "Removed",
    remove: "Remove from my files",
    view: "Open reviewed record",
    clear: "Clear private activity",
    explore: "Explore reviewed records",
    community: "View approved community observations",
    communityBoundary: "COMMUNITY-REPORTED · MODERATED",
    communityText:
      "Public experiences remain separate from this private activity history and appear only after moderation.",
    kind: {
      scheme: "Scheme",
      project: "Project",
      budget: "Budget",
      public_money: "Public money",
      procurement: "Procurement",
      officeholder: "Officeholder",
      election_result: "Election result",
    },
  },
  te: {
    private: "ప్రైవేట్ · ఈ పరికరంలో మాత్రమే",
    watchTitle: "నా ఫైళ్లు",
    watchNav: "నా ఫైళ్లు",
    diaryNav: "కార్యాచరణ",
    discoverNav: "కనుగొనండి",
    watchIntro:
      "గుర్తింపును సృష్టించకుండా లేదా మీ ఆసక్తులను సర్వర్‌కు పంపకుండా సమీక్షించిన రికార్డులను అనుసరించండి.",
    watchEmpty: "మీరు ఇంకా ఫైళ్లను అనుసరించలేదు",
    watchEmptyText:
      "సమీక్షించిన పథకం, ప్రాజెక్టు, ప్రజా ధనం, కొనుగోలు, అధికారి లేదా ఎన్నికల రికార్డును తెరిచి ఈ రికార్డును అనుసరించండి ఎంచుకోండి.",
    diaryTitle: "మీ కార్యాచరణ",
    diaryIntro:
      "ఈ బ్రౌజర్‌లో అనుసరించిన లేదా తొలగించిన రికార్డుల ప్రైవేట్ చరిత్ర. ఇది పబ్లిక్ కార్యకలాప ఫీడ్ లేదా రాజకీయ అభిరుచి ప్రొఫైల్ కాదు.",
    diaryEmpty: "స్థానిక కార్యాచరణ ఇంకా లేదు",
    diaryEmptyText:
      "సమీక్షించిన రికార్డును అనుసరించడం మొదటి పరికర-ప్రైవేట్ కార్యాచరణ నమోదును సృష్టిస్తుంది.",
    followed: "అనుసరించారు",
    removed: "తొలగించారు",
    remove: "నా ఫైళ్ల నుండి తొలగించండి",
    view: "సమీక్షించిన రికార్డును తెరవండి",
    clear: "ప్రైవేట్ కార్యాచరణను తొలగించండి",
    explore: "సమీక్షించిన రికార్డులను అన్వేషించండి",
    community: "ఆమోదించిన కమ్యూనిటీ పరిశీలనలను చూడండి",
    communityBoundary: "కమ్యూనిటీ నివేదిక · మోడరేట్ చేయబడింది",
    communityText:
      "ప్రజా అనుభవాలు ఈ ప్రైవేట్ కార్యాచరణ చరిత్ర నుండి వేరుగా ఉంటాయి మరియు మోడరేషన్ తర్వాత మాత్రమే కనిపిస్తాయి.",
    kind: {
      scheme: "పథకం",
      project: "ప్రాజెక్టు",
      budget: "బడ్జెట్",
      public_money: "ప్రజా ధనం",
      procurement: "కొనుగోలు",
      officeholder: "అధికారి",
      election_result: "ఎన్నికల ఫలితం",
    },
  },
} as const;

export function CivicTrackingCollection({
  mode,
}: {
  mode: "watchlist" | "diary";
}) {
  const { locale } = useLocale();
  const labels = locale === "te" ? copy.te : copy.en;
  const [watchlist, setWatchlist] = useState<CivicTrackedRecord[]>([]);
  const [diary, setDiary] = useState<CivicDiaryEntry[]>([]);

  useEffect(() => {
    const refresh = () => {
      const state = readCivicTracking();
      setWatchlist(state.watchlist);
      setDiary(state.diary);
    };
    refresh();
    return subscribeCivicTracking(refresh);
  }, []);

  const entries = mode === "watchlist" ? watchlist : diary;
  const title = mode === "watchlist" ? labels.watchTitle : labels.diaryTitle;
  const intro = mode === "watchlist" ? labels.watchIntro : labels.diaryIntro;
  const emptyTitle =
    mode === "watchlist" ? labels.watchEmpty : labels.diaryEmpty;
  const emptyText =
    mode === "watchlist" ? labels.watchEmptyText : labels.diaryEmptyText;

  return (
    <>
      <header className={styles.header}>
        <p className="eyebrow">{labels.private}</p>
        <h1>{title}</h1>
        <p>{intro}</p>
        <nav className={styles.viewNav} aria-label={title}>
          <Link
            href="/lists"
            aria-current={mode === "watchlist" ? "page" : undefined}
          >
            {labels.watchNav} <span>{watchlist.length}</span>
          </Link>
          <Link
            href="/activity"
            aria-current={mode === "diary" ? "page" : undefined}
          >
            {labels.diaryNav} <span>{diary.length}</span>
          </Link>
          <Link href="/explore-data">{labels.discoverNav} →</Link>
        </nav>
      </header>
      {entries.length === 0 ? (
        <section className="card" aria-labelledby={`${mode}-empty-heading`}>
          <h2 id={`${mode}-empty-heading`}>{emptyTitle}</h2>
          <p>{emptyText}</p>
          <Link href="/explore-data" className="button button--secondary">
            {labels.explore} →
          </Link>
        </section>
      ) : (
        <section aria-label={title} className={styles.collection}>
          {mode === "diary" && (
            <button className="button" type="button" onClick={clearCivicDiary}>
              {labels.clear}
            </button>
          )}
          <div className={styles.grid}>
            {mode === "watchlist"
              ? watchlist.map((record) => (
                  <article className={styles.card} key={record.id}>
                    <p className="eyebrow">{labels.kind[record.kind]}</p>
                    <h2>{record.title}</h2>
                    <time dateTime={record.followed_at}>
                      {new Date(record.followed_at).toLocaleDateString(
                        locale === "te" ? "te-IN" : "en-IN",
                      )}
                    </time>
                    <div>
                      <Link href={record.href}>{labels.view} →</Link>
                      <button
                        type="button"
                        onClick={() => unfollowCivicRecord(record)}
                      >
                        {labels.remove}
                      </button>
                    </div>
                  </article>
                ))
              : diary.map((entry) => (
                  <article className={styles.card} key={entry.id}>
                    <p className="eyebrow">
                      {entry.action === "followed"
                        ? labels.followed
                        : labels.removed}{" "}
                      · {labels.kind[entry.record.kind]}
                    </p>
                    <h2>{entry.record.title}</h2>
                    <time dateTime={entry.occurred_at}>
                      {new Date(entry.occurred_at).toLocaleString(
                        locale === "te" ? "te-IN" : "en-IN",
                      )}
                    </time>
                    <Link href={entry.record.href}>{labels.view} →</Link>
                  </article>
                ))}
          </div>
        </section>
      )}
      <aside className={styles.community}>
        <strong>{labels.communityBoundary}</strong>
        <p>{labels.communityText}</p>
        <Link href="/community">{labels.community} →</Link>
      </aside>
    </>
  );
}
