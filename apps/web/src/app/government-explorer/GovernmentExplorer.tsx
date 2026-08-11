"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
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
    eyebrow: "Government explorer",
    title: "Find a place. Follow the institution.",
    intro:
      "Browse reviewed district and department records with their official source attached.",
    districts: "Districts",
    departments: "Departments",
    search: "Search names and aliases",
    placeholder: "Try Visakhapatnam, Vizag or పాఠశాల…",
    submit: "Search",
    loading: "Loading official records…",
    empty: "No reviewed records match this search.",
    error: "The official-record API could not be reached.",
    retry: "Try again",
    source: "Official source",
    retrieved: "Retrieved",
    incomplete: "Coverage notice",
    incompleteText:
      "This Stage 1 baseline contains the requested 26 districts. LGD now lists Markapuram and Polavaram as additional districts; both await separate review.",
    noBoundary: "Boundary not yet available",
    pilot: "Pilot district",
    fixture: "Development fixture",
    reviewed: "Reviewed record",
  },
  te: {
    eyebrow: "ప్రభుత్వ అన్వేషణ",
    title: "ప్రాంతాన్ని కనుగొనండి. సంస్థను తెలుసుకోండి.",
    intro: "అధికారిక మూలాలతో సమీక్షించిన జిల్లా మరియు శాఖ రికార్డులను చూడండి.",
    districts: "జిల్లాలు",
    departments: "శాఖలు",
    search: "పేర్లు మరియు ప్రత్యామ్నాయ పేర్లలో వెతకండి",
    placeholder: "విశాఖపట్నం, Vizag లేదా పాఠశాల…",
    submit: "వెతకండి",
    loading: "అధికారిక రికార్డులు లోడ్ అవుతున్నాయి…",
    empty: "ఈ శోధనకు సరిపోలే సమీక్షించిన రికార్డులు లేవు.",
    error: "అధికారిక రికార్డు API అందుబాటులో లేదు.",
    retry: "మళ్లీ ప్రయత్నించండి",
    source: "అధికారిక మూలం",
    retrieved: "సేకరించిన తేదీ",
    incomplete: "కవరేజ్ గమనిక",
    incompleteText:
      "ఈ దశలో కోరిన 26 జిల్లాలు ఉన్నాయి. LGD ఇప్పుడు మార్కాపురం మరియు పోలవరం జిల్లాలను కూడా చూపుతోంది; వాటి సమీక్ష ఇంకా పూర్తి కాలేదు.",
    noBoundary: "సరిహద్దు సమాచారం ఇంకా అందుబాటులో లేదు",
    pilot: "పైలట్ జిల్లా",
    fixture: "డెవలప్‌మెంట్ ఫిక్చర్",
    reviewed: "సమీక్షించిన రికార్డు",
  },
} as const;

function recordName(record: ExplorerRecord, locale: Locale): string {
  return locale === "te" && record.name_te ? record.name_te : record.name_en;
}

function isGeography(record: ExplorerRecord): record is GeographyRecord {
  return "entity_type" in record;
}

export function GovernmentExplorer() {
  const [locale, setLocale] = useState<Locale>("en");
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
    <main className={styles.page}>
      <nav className={styles.nav} aria-label="Government Explorer navigation">
        <Link className={styles.brand} href="/">
          <span className={styles.brandMark}>AP</span>
          <span>Public Ledger</span>
        </Link>
        <div className={styles.language} aria-label="Language">
          <button
            aria-pressed={locale === "en"}
            onClick={() => setLocale("en")}
            type="button"
          >
            English
          </button>
          <button
            aria-pressed={locale === "te"}
            lang="te"
            onClick={() => setLocale("te")}
            type="button"
          >
            తెలుగు
          </button>
        </div>
      </nav>

      <header className={styles.header}>
        <p className={styles.eyebrow}>{labels.eyebrow}</p>
        <h1>{labels.title}</h1>
        <p>{labels.intro}</p>
      </header>

      <section className={styles.workspace} aria-labelledby="catalog-heading">
        <h2 className={styles.srOnly} id="catalog-heading">
          {labels.eyebrow}
        </h2>
        <div className={styles.controls}>
          <div
            className={styles.tabs}
            role="tablist"
            aria-label={labels.eyebrow}
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
              <button type="submit">{labels.submit}</button>
            </div>
          </form>
        </div>

        {tab === "districts" && (
          <aside className={styles.coverage} aria-label={labels.incomplete}>
            <strong>{labels.incomplete}</strong>
            <span>{labels.incompleteText}</span>
          </aside>
        )}

        <div aria-live="polite" className={styles.results}>
          {state === "loading" && (
            <div className={styles.state} role="status">
              <span className={styles.spinner} aria-hidden="true" />
              {labels.loading}
            </div>
          )}
          {state === "error" && (
            <div className={styles.state} role="alert">
              <strong>{labels.error}</strong>
              <button onClick={() => void load()} type="button">
                {labels.retry}
              </button>
            </div>
          )}
          {state === "ready" && records.length === 0 && (
            <p className={styles.state}>{labels.empty}</p>
          )}
          {state === "ready" && records.length > 0 && (
            <ul className={styles.grid}>
              {records.map((record) => (
                <li className={styles.card} key={record.id}>
                  <div className={styles.cardTop}>
                    <span>
                      {record.provenance.is_fixture
                        ? labels.fixture
                        : labels.reviewed}
                    </span>
                    {isGeography(record) && record.is_pilot && (
                      <strong>{labels.pilot}</strong>
                    )}
                  </div>
                  <h3 lang={locale}>{recordName(record, locale)}</h3>
                  {locale === "te" && (
                    <p className={styles.secondaryName}>{record.name_en}</p>
                  )}
                  <dl>
                    {record.official_code && (
                      <>
                        <dt>Code</dt>
                        <dd>{record.official_code}</dd>
                      </>
                    )}
                    {isGeography(record) ? (
                      <>
                        <dt>Geometry</dt>
                        <dd>
                          {record.has_boundary
                            ? "Available"
                            : labels.noBoundary}
                        </dd>
                      </>
                    ) : (
                      <>
                        <dt>Sector</dt>
                        <dd>{record.sector ?? "—"}</dd>
                      </>
                    )}
                  </dl>
                  <div className={styles.source}>
                    <span>{labels.source}</span>
                    <a
                      href={record.provenance.official_source_url}
                      rel="noreferrer"
                      target="_blank"
                    >
                      {record.provenance.source_name}
                    </a>
                    <small>
                      {labels.retrieved}: {record.provenance.retrieval_date}
                    </small>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </main>
  );
}
