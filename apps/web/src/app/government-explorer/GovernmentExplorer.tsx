"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { PageFooter } from "@/components/PageFooter";
import {
  ErrorState,
  ReviewState,
  SourceSummary,
} from "@/components/RecordStatus";
import { SiteHeader } from "@/components/SiteHeader";
import { useLocale } from "@/components/LocaleProvider";
import { getDepartments, getDistricts } from "@/lib/catalog-api";
import type {
  GeographyRecord,
  GovernmentBodyRecord,
  Locale,
} from "@/lib/catalog-types";
import styles from "./government-explorer.module.css";

type ExplorerTab = "districts" | "departments";
type ExplorerRecord = GeographyRecord | GovernmentBodyRecord;

const copy = {
  en: {
    eyebrow: "ANDHRA PRADESH · REVIEWED DATASET",
    title: "Government Explorer",
    intro:
      "Browse source-linked district and department records in India’s first live state dataset.",
    districts: "Districts",
    departments: "Departments",
    search: "Search names and aliases",
    placeholder: "Visakhapatnam, Vizag or పాఠశాల",
    submit: "Search",
    loading: "Loading reviewed public records…",
    empty: "No reviewed records match this search.",
    error: "The official-record API could not be reached.",
    incomplete: "District coverage note",
    incompleteText:
      "This reviewed baseline contains 28 district records. Markapuram and Polavaram were published from the live LGD district feed; district boundaries are not yet reviewed.",
    ingestionLink: "Open the ingestion status page",
    noBoundary: "Boundary not reviewed or unavailable",
    pilot: "Pilot district",
  },
  te: {
    eyebrow: "ఆంధ్రప్రదేశ్ · సమీక్షించిన డేటాసెట్",
    title: "ప్రభుత్వ అన్వేషణ",
    intro:
      "భారతదేశంలో మొదట అందుబాటులోకి వచ్చిన రాష్ట్ర డేటాసెట్‌లో మూలాలతో కూడిన జిల్లా, శాఖ రికార్డులను చూడండి.",
    districts: "జిల్లాలు",
    departments: "శాఖలు",
    search: "పేర్లు మరియు ప్రత్యామ్నాయ పేర్లలో వెతకండి",
    placeholder: "విశాఖపట్నం, Vizag లేదా పాఠశాల",
    submit: "వెతకండి",
    loading: "సమీక్షించిన ప్రజా రికార్డులు లోడ్ అవుతున్నాయి…",
    empty: "ఈ శోధనకు సరిపోలే సమీక్షించిన రికార్డులు లేవు.",
    error: "అధికారిక రికార్డు API అందుబాటులో లేదు.",
    incomplete: "జిల్లా కవరేజ్ గమనిక",
    incompleteText:
      "ఈ సమీక్షించిన ప్రాతిపదికలో 28 జిల్లా రికార్డులు ఉన్నాయి. మార్కాపురం, పోలవరం ప్రత్యక్ష LGD ఫీడ్ నుండి ప్రచురించబడ్డాయి; జిల్లా సరిహద్దులు ఇంకా సమీక్షించబడలేదు.",
    ingestionLink: "ఇన్‌జెస్టెన్ స్థితి పేజీని తెరవండి",
    noBoundary: "సరిహద్దు సమీక్షించబడలేదు లేదా అందుబాటులో లేదు",
    pilot: "పైలట్ జిల్లా",
  },
} as const;

function recordName(record: ExplorerRecord, locale: Locale) {
  return locale === "te" && record.name_te ? record.name_te : record.name_en;
}
function isGeography(record: ExplorerRecord): record is GeographyRecord {
  return "entity_type" in record;
}

export function GovernmentExplorer() {
  const { locale } = useLocale();
  const [tab, setTab] = useState<ExplorerTab>("districts");
  const [records, setRecords] = useState<ExplorerRecord[]>([]);
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const labels = copy[locale];

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setState("loading");
      try {
        const response =
          tab === "districts"
            ? await getDistricts(submittedQuery, signal)
            : await getDepartments(submittedQuery, signal);
        setRecords(response.data);
        setState("ready");
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError")
          return;
        setRecords([]);
        setState("error");
      }
    },
    [submittedQuery, tab],
  );

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => void load(controller.signal), 0);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [load]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmittedQuery(query.trim());
  }

  return (
    <>
      <SiteHeader />
      <main id="main-content">
        <header className="page-intro shell">
          <p className="eyebrow">{labels.eyebrow}</p>
          <h1>{labels.title}</h1>
          <p className="lede">{labels.intro}</p>
        </header>
        <section className="section shell" aria-labelledby="catalog-heading">
          <div className={styles.toolbar}>
            <div>
              <h2 className="sr-only" id="catalog-heading">
                {labels.title}
              </h2>
              <div
                className="directory-tabs"
                role="tablist"
                aria-label={labels.title}
              >
                {(["districts", "departments"] as const).map((item) => (
                  <button
                    aria-selected={tab === item}
                    key={item}
                    onClick={() => setTab(item)}
                    role="tab"
                    type="button"
                  >
                    {labels[item]}
                  </button>
                ))}
              </div>
            </div>
            <form className={styles.search} onSubmit={submit} role="search">
              <label htmlFor="catalog-search">{labels.search}</label>
              <div>
                <input
                  autoComplete="off"
                  id="catalog-search"
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={labels.placeholder}
                  type="search"
                  value={query}
                />
                <button className="button button--primary" type="submit">
                  {labels.submit}
                </button>
              </div>
            </form>
          </div>

          {tab === "districts" && (
            <aside className={styles.coverage} aria-label={labels.incomplete}>
              <strong>{labels.incomplete}</strong>
              <span>{labels.incompleteText}</span>
              <Link href="/ingestion">{labels.ingestionLink}</Link>
            </aside>
          )}

          <div aria-live="polite" className={styles.results}>
            {state === "loading" && (
              <div className="page-state" role="status">
                {labels.loading}
              </div>
            )}
            {state === "error" && (
              <ErrorState message={labels.error} onRetry={() => void load()} />
            )}
            {state === "ready" && records.length === 0 && (
              <div className="empty-state">
                <h3>{labels.empty}</h3>
                <p>Try another English, Telugu or alternate name.</p>
              </div>
            )}
            {state === "ready" && records.length > 0 && (
              <ul className={styles.records}>
                {records.map((record) => (
                  <li key={record.id}>
                    <div className={styles.identity}>
                      <div>
                        <ReviewState provenance={record.provenance} />
                        {isGeography(record) && record.is_pilot && (
                          <span className={styles.pilot}>{labels.pilot}</span>
                        )}
                      </div>
                      <h3 lang={locale}>{recordName(record, locale)}</h3>
                      {locale === "te" && <p>{record.name_en}</p>}
                      {record.aliases.length > 0 && (
                        <small>
                          Aliases:{" "}
                          {record.aliases
                            .map((alias) => alias.value)
                            .join(", ")}
                        </small>
                      )}
                    </div>
                    <dl>
                      <div>
                        <dt>Type</dt>
                        <dd>
                          {isGeography(record)
                            ? record.entity_type
                            : record.body_type}
                        </dd>
                      </div>
                      <div>
                        <dt>Official code</dt>
                        <dd>{record.official_code ?? "Not stated"}</dd>
                      </div>
                      <div>
                        <dt>{isGeography(record) ? "Boundary" : "Sector"}</dt>
                        <dd>
                          {isGeography(record)
                            ? record.has_boundary
                              ? "Available"
                              : labels.noBoundary
                            : (record.sector ?? "Not stated")}
                        </dd>
                      </div>
                    </dl>
                    <SourceSummary provenance={record.provenance} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </main>
      <PageFooter />
    </>
  );
}
