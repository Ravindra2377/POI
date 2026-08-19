"use client";

import { useCallback, useEffect, useState } from "react";
import { ErrorState } from "@/components/RecordStatus";
import { SiteHeader } from "@/components/SiteHeader";
import { PageFooter } from "@/components/PageFooter";
import { useLocale } from "@/components/LocaleProvider";
import { getIngestionFeeds } from "@/lib/catalog-api";
import type { FeedStatus, Locale } from "@/lib/catalog-types";
import styles from "./ingestion.module.css";

const copy = {
  en: {
    eyebrow: "NETWORK INGESTION · LIVE DISTRICT FEEDS",
    title: "Data Ingestion",
    intro:
      "Raw official responses are stored as immutable snapshots, extracted into typed observations, and published only after an audited review. This page shows the live status of every registered feed.",
    feedStatus: "Feed status",
    loading: "Loading ingestion status…",
    empty: "No network ingestion runs recorded yet.",
    emptyText:
      "The district feed is ingested by an explicit operator command. Snapshots, extractions and review decisions appear here after the first run; until then no raw official response is stored or published.",
    error: "The official-record API could not be reached.",
    openSource: "Open the official source",
    snapshot: "Latest snapshot",
    extraction: "Latest extraction",
    adapter: "Adapter",
    records: "Records",
    observations: "Observations",
    review: "Latest review",
    reviewPending: "Review pending",
    decisionApprove: "Approved",
    decisionReject: "Rejected",
    retrieved: "Retrieved",
    notYetStored: "No snapshot stored yet",
    notYetExtracted: "No extraction run recorded yet",
    shaLabel: "Checksum",
    prepared: "Prepared",
    preparedText:
      "Raw snapshot contents are never served by the public API; only status metadata is shown. Reviewer identities are not disclosed.",
  },
  te: {
    eyebrow: "నెట్‌వర్క్ ఇన్‌జెస్టెన్ · ప్రత్యక్ష జిల్లా ఫీడ్‌లు",
    title: "డేటా సేకరణ",
    intro:
      "అధికారిక ప్రతిస్పందనలు మార్చలేని స్నాప్‌షాట్‌లుగా నిల్వ చేయబడతాయి, టైపు చేసిన పరిశీలనలుగా వెలికితీయబడతాయి, ఆడిట్ చేయబడిన సమీక్ష తర్వాత మాత్రమే ప్రచురించబడతాయి. నమోదైన ప్రతి ఫీడ్ యొక్క ప్రత్యక్ష స్థితిని ఈ పేజీ చూపిస్తుంది.",
    feedStatus: "ఫీడ్ స్థితి",
    loading: "ఇన్‌జెస్టెన్ స్థితి లోడ్ అవుతోంది…",
    empty: "ఇంకా నెట్‌వర్క్ ఇన్‌జెస్టెన్ నమోదు కాలేదు.",
    emptyText:
      "జిల్లా ఫీడ్ నిర్దేశిత ఆపరేటర్ ఆదేశంతో సేకరించబడుతుంది. మొదటి రన్ తర్వాత స్నాప్‌షాట్‌లు, వెలికితీతలు, సమీక్ష నిర్ణయాలు ఇక్కడ కనిపిస్తాయి; అంతవరకు అధికారిక ప్రతిస్పందన నిల్వ లేదా ప్రచురించబడదు.",
    error: "అధికారిక రికార్డు API అందుబాటులో లేదు.",
    openSource: "అధికారిక మూలాన్ని తెరవండి",
    snapshot: "తాజా స్నాప్‌షాట్",
    extraction: "తాజా వెలికితీత",
    adapter: "అడాప్టర్",
    records: "రికార్డులు",
    observations: "పరిశీలనలు",
    review: "తాజా సమీక్ష",
    reviewPending: "సమీక్ష పెండింగ్‌లో ఉంది",
    decisionApprove: "ఆమోదించబడింది",
    decisionReject: "తిరస్కరించబడింది",
    retrieved: "సేకరించబడింది",
    notYetStored: "ఇంకా స్నాప్‌షాట్ నిల్వ కాలేదు",
    notYetExtracted: "ఇంకా వెలికితీత నమోదు కాలేదు",
    shaLabel: "చెక్‌సమ్",
    prepared: "తయారు",
    preparedText:
      "ముడి స్నాప్‌షాట్ కంటెంట్‌ను పబ్లిక్ API బహిర్గతం చేయదు; స్థితి మెటాడేటా మాత్రమే చూపబడుతుంది. సమీక్షకుల గుర్తింపు బహిర్గతం చేయబడదు.",
  },
} as const;

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "te" ? "te-IN" : "en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getCopyLabels<T>(copyObj: Record<string, T>, loc: string): T {
  return copyObj[loc] ?? copyObj.en;
}

export function IngestionContent() {
  const { locale } = useLocale();
  const [feeds, setFeeds] = useState<FeedStatus[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const labels = getCopyLabels(copy, locale);

  const load = useCallback(async (signal?: AbortSignal) => {
    setState("loading");
    try {
      const response = await getIngestionFeeds(signal);
      setFeeds(response);
      setState("ready");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setFeeds([]);
      setState("error");
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => void load(controller.signal), 0);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [load]);

  return (
    <>
      <SiteHeader />
      <main id="main-content">
        <header className="page-intro shell">
          <p className="eyebrow">{labels.eyebrow}</p>
          <h1>{labels.title}</h1>
          <p className="lede">{labels.intro}</p>
        </header>
        <section
          className="section shell"
          aria-labelledby="feed-status-heading"
        >
          <h2 className="sr-only" id="feed-status-heading">
            {labels.feedStatus}
          </h2>

          <div aria-live="polite" className={styles.results}>
            {state === "loading" && (
              <div className="page-state" role="status">
                {labels.loading}
              </div>
            )}
            {state === "error" && (
              <ErrorState message={labels.error} onRetry={() => void load()} />
            )}
            {state === "ready" && feeds.length === 0 && (
              <div className="empty-state">
                <h3>{labels.empty}</h3>
                <p>{labels.emptyText}</p>
              </div>
            )}
            {state === "ready" && feeds.length > 0 && (
              <ul className={styles.feeds}>
                {feeds.map((feed) => (
                  <li key={feed.source.official_source_url}>
                    <div className={styles.identity}>
                      <span
                        className="status-label"
                        data-state={feed.source.review_status}
                      >
                        {feed.source.review_status === "reviewed"
                          ? "Reviewed"
                          : "Review pending"}
                      </span>
                      <h3>{feed.source.name}</h3>
                      <p>{feed.source.publisher}</p>
                      <a
                        href={
                          feed.source.public_source_url ??
                          feed.source.official_source_url
                        }
                        rel="noreferrer"
                        target="_blank"
                      >
                        {labels.openSource}
                      </a>
                      <small className={styles.endpoint}>
                        {feed.source.official_source_url}
                      </small>
                    </div>

                    <dl>
                      <div>
                        <dt>{labels.snapshot}</dt>
                        <dd>
                          {feed.latest_snapshot ? (
                            <>
                              <span>
                                {formatDate(
                                  feed.latest_snapshot.retrieved_at,
                                  locale,
                                )}
                              </span>
                              <span>
                                HTTP {feed.latest_snapshot.http_status} ·{" "}
                                {feed.latest_snapshot.content_type} ·{" "}
                                {formatBytes(
                                  feed.latest_snapshot.file_size_bytes,
                                )}
                              </span>
                              <small>
                                {labels.shaLabel}:{" "}
                                {feed.latest_snapshot.sha256.slice(0, 12)}…
                              </small>
                            </>
                          ) : (
                            labels.notYetStored
                          )}
                        </dd>
                      </div>
                      <div>
                        <dt>{labels.extraction}</dt>
                        <dd>
                          {feed.latest_extraction ? (
                            <>
                              <span>
                                {labels.adapter}:{" "}
                                {feed.latest_extraction.adapter_name} v
                                {feed.latest_extraction.adapter_version}
                              </span>
                              <span>
                                {labels.records}:{" "}
                                {feed.latest_extraction.extracted_record_count}{" "}
                                · {feed.latest_extraction.status}
                              </span>
                            </>
                          ) : (
                            labels.notYetExtracted
                          )}
                        </dd>
                      </div>
                      <div>
                        <dt>{labels.observations}</dt>
                        <dd>
                          <span>
                            {feed.observation_counts.published} /{" "}
                            {feed.observation_counts.total} published
                          </span>
                        </dd>
                      </div>
                      <div>
                        <dt>{labels.review}</dt>
                        <dd>
                          {feed.latest_review ? (
                            <>
                              <span>
                                {feed.latest_review.decision === "approve"
                                  ? labels.decisionApprove
                                  : labels.decisionReject}
                              </span>
                              <span>
                                {formatDate(
                                  feed.latest_review.decided_at,
                                  locale,
                                )}
                              </span>
                            </>
                          ) : (
                            labels.reviewPending
                          )}
                        </dd>
                      </div>
                    </dl>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <aside className={styles.prepared} aria-label={labels.prepared}>
            <strong>{labels.prepared}</strong>
            <span>{labels.preparedText}</span>
          </aside>
        </section>
      </main>
      <PageFooter />
    </>
  );
}
