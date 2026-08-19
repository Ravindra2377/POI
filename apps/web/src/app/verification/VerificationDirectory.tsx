"use client";

import { useEffect, useState } from "react";
import { useLocale } from "@/components/LocaleProvider";
import { PageFooter } from "@/components/PageFooter";
import { SiteHeader } from "@/components/SiteHeader";
import type { Locale } from "@/lib/catalog-types";
import {
  getComparisons,
  localizedComparisonText,
  type ClaimRecordComparison,
} from "@/lib/comparisons";
import styles from "./verification.module.css";

const copy = {
  en: {
    eyebrow: "CLAIMS VS RECORDS · PLATFORM CALCULATION",
    title: "Verification",
    intro:
      "A calculated layer that pairs an official government claim with the recorded outcome, so divergence is visible and sourced.",
    prepared: "Prepared directory · No reviewed comparisons",
    preparedText:
      "The calculation rules and routes are ready. No comparison is published until it pairs two reviewed official observations.",
    ruleNotVerdict: "A comparison is a calculation, not a verdict.",
    ruleNotCrowd: "Only reviewed official observations are paired.",
    ruleNotClaim: "A divergence flags a gap, it does not assert motive.",
    loading: "Loading reviewed comparisons…",
    emptyTitle: "No reviewed comparisons are published yet",
    emptyText:
      "This is an intentionally empty prepared-data state, not a claim that claims and records always match.",
    errorTitle: "Comparisons could not be loaded",
    errorText:
      "The prepared catalogue is temporarily unavailable. No comparison is being substituted.",
    retry: "Retry",
    claim: "Claim",
    record: "Recorded outcome",
    difference: "Difference",
    differencePercent: "Divergence",
    method: "Method",
    consistent: "Consistent",
    divergent: "Divergent",
    insufficientData: "Insufficient data",
    withinTolerance: "Within tolerance",
    beyondTolerance: "Beyond tolerance",
    tolerance: "Tolerance",
    source: "Official source",
    reviewedOn: "Reviewed",
    openSource: "View source",
  },
  te: {
    eyebrow: "వాదనలు vs రికార్డులు · వేదిక లెక్కింపు",
    title: "ధృవీకరణ",
    intro:
      "ప్రభుత్వ అధికారిక వాదనను నమోదైన ఫలితంతో జత చేసి, వ్యత్యాసం కనిపించేలా, మూలాలతో సహా చూపే లెక్కించిన పొర.",
    prepared: "సిద్ధం చేసిన డైరెక్టరీ · సమీక్షించిన పోలికలు లేవు",
    preparedText:
      "లెక్కింపు నియమాలు మరియు మార్గాలు సిద్ధంగా ఉన్నాయి. రెండు సమీక్షించిన అధికారిక పరిశీలనలను జత చేసే వరకు ఏ పోలిక ప్రచురించబడదు.",
    ruleNotVerdict: "పోలిక తీర్పు కాదు, లెక్కింపు.",
    ruleNotCrowd: "సమీక్షించిన అధికారిక పరిశీలనలను మాత్రమే జత చేస్తాము.",
    ruleNotClaim: "వ్యత్యాసం లోటును చూపుతుంది, ఉద్దేశ్యాన్ని చెప్పదు.",
    loading: "సమీక్షించిన పోలికలు లోడ్ అవుతున్నాయి…",
    emptyTitle: "సమీక్షించిన పోలికలు ఇంకా ప్రచురించబడలేదు",
    emptyText:
      "ఇది ఉద్దేశపూర్వకంగా ఖాళీగా ఉన్న సిద్ధం చేసిన డేటా స్థితి; వాదనలు, రికార్డులు ఎప్పుడూ సరిపోలుతాయని చెప్పడం కాదు.",
    errorTitle: "పోలికలను లోడ్ చేయలేకపోయాము",
    errorText:
      "సిద్ధం చేసిన జాబితా తాత్కాలికంగా అందుబాటులో లేదు. ప్రత్యామ్నాయ పోలిక చూపబడదు.",
    retry: "మళ్లీ ప్రయత్నించండి",
    claim: "వాదన",
    record: "నమోదైన ఫలితం",
    difference: "తేడా",
    differencePercent: "వ్యత్యాసం",
    method: "పద్ధతి",
    consistent: "స్థిరం",
    divergent: "వ్యత్యాసం కలది",
    insufficientData: "తగినంత డేటా లేదు",
    withinTolerance: "సహన పరిమితిలో",
    beyondTolerance: "సహన పరిమితికి మించి",
    tolerance: "సహన పరిమితి",
    source: "అధికారిక మూలం",
    reviewedOn: "సమీక్షించిన తేదీ",
    openSource: "మూలం చూడండి",
  },
} as const;

type Copy = { [Key in keyof (typeof copy)["en"]]: string };

function verdictLabel(value: string, labels: Copy): string {
  if (value === "consistent") return labels.consistent;
  if (value === "divergent") return labels.divergent;
  return labels.insufficientData;
}

function sourceUrl(
  comparison: ClaimRecordComparison,
  side: "claim" | "record",
): string | null {
  const observation = side === "claim" ? comparison.claim : comparison.record;
  return (
    observation.public_source_url ?? observation.official_source_url ?? null
  );
}

function formatPercent(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return "—";
  const numeric = typeof value === "string" ? Number(value) : value;
  return Number.isFinite(numeric) ? `${numeric.toFixed(2)}%` : String(value);
}

function formatRupees(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return "—";
  const numeric = typeof value === "string" ? Number(value) : value;
  return Number.isFinite(numeric)
    ? numeric.toLocaleString("en-IN")
    : String(value);
}

function getCopyLabels<T>(copyObj: Record<string, T>, loc: string): T {
  return copyObj[loc] ?? copyObj.en;
}

export function VerificationDirectory() {
  const { locale } = useLocale();
  const labels = getCopyLabels(copy, locale);
  const [comparisons, setComparisons] = useState<ClaimRecordComparison[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  async function load(signal?: AbortSignal) {
    setState("loading");
    try {
      const response = await getComparisons(signal);
      setComparisons(response.data);
      setState("ready");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setComparisons([]);
      setState("error");
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => void load(controller.signal), 0);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, []);

  return (
    <>
      <SiteHeader />
      <main id="main-content">
        <header className="page-intro shell">
          <p className="eyebrow">{labels.eyebrow}</p>
          <h1>{labels.title}</h1>
          <p className="lede">{labels.intro}</p>
          <aside className={styles.notice} aria-label={labels.prepared}>
            <strong>{labels.prepared}</strong>
            <p>{labels.preparedText}</p>
          </aside>
        </header>

        <section className="money-rules">
          <div className="shell money-rules__grid">
            <strong>{labels.ruleNotVerdict}</strong>
            <strong>{labels.ruleNotCrowd}</strong>
            <strong>{labels.ruleNotClaim}</strong>
          </div>
        </section>

        <section className="section shell" aria-labelledby="verification">
          <h2 className="sr-only" id="verification">
            {labels.title}
          </h2>
          <div className={styles.results} aria-live="polite">
            {state === "loading" && (
              <div className="page-state" role="status">
                {labels.loading}
              </div>
            )}
            {state === "error" && (
              <div className="error-state" role="alert">
                <h3>{labels.errorTitle}</h3>
                <p>{labels.errorText}</p>
                <button
                  className="button button--secondary"
                  onClick={() => void load()}
                  type="button"
                >
                  {labels.retry}
                </button>
              </div>
            )}
            {state === "ready" && comparisons.length === 0 && (
              <div className="empty-state">
                <h3>{labels.emptyTitle}</h3>
                <p>{labels.emptyText}</p>
              </div>
            )}
            {state === "ready" && comparisons.length > 0 && (
              <ul className={styles.records}>
                {comparisons.map((comparison) => (
                  <li key={comparison.id} className={styles.record}>
                    <div className={styles.recordHead}>
                      <h3 lang={locale}>
                        {localizedComparisonText(
                          comparison.entity_label,
                          locale,
                        )}
                      </h3>
                      <span
                        className={styles.verdict}
                        data-verdict={comparison.verdict}
                      >
                        {verdictLabel(comparison.verdict, labels)}
                        <small>
                          {comparison.verdict === "consistent"
                            ? labels.withinTolerance
                            : comparison.verdict === "divergent"
                              ? labels.beyondTolerance
                              : ""}
                        </small>
                      </span>
                    </div>

                    <div className={styles.sides}>
                      <ComparisonSide
                        sideLabel={labels.claim}
                        observation={comparison.claim}
                        sourceUrl={sourceUrl(comparison, "claim")}
                        openSource={labels.openSource}
                        locale={locale}
                      />
                      <ComparisonSide
                        sideLabel={labels.record}
                        observation={comparison.record}
                        sourceUrl={sourceUrl(comparison, "record")}
                        openSource={labels.openSource}
                        locale={locale}
                      />
                    </div>

                    <dl className={styles.numbers}>
                      <div>
                        <dt>{labels.difference}</dt>
                        <dd>{formatRupees(comparison.difference)}</dd>
                      </div>
                      <div>
                        <dt>{labels.differencePercent}</dt>
                        <dd>
                          {comparison.difference_percent === null ? (
                            "—"
                          ) : (
                            <span
                              data-direction={
                                Number(comparison.difference_percent) < 0
                                  ? "down"
                                  : "up"
                              }
                            >
                              {formatPercent(comparison.difference_percent)}
                            </span>
                          )}
                        </dd>
                      </div>
                      <div>
                        <dt>{labels.tolerance}</dt>
                        <dd>{formatPercent(comparison.tolerance_percent)}</dd>
                      </div>
                    </dl>

                    <div className={styles.method}>
                      <strong>{labels.method}</strong>
                      <p lang={locale}>
                        {localizedComparisonText(comparison.method, locale)}
                      </p>
                    </div>

                    <p className={styles.footnote}>
                      {labels.reviewedOn}{" "}
                      {comparison.decided_at
                        ? new Date(comparison.decided_at).toLocaleDateString()
                        : "—"}
                      {" · "}
                      <span data-classification={comparison.classification}>
                        {comparison.classification}
                      </span>
                    </p>
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

function ComparisonSide({
  sideLabel,
  observation,
  sourceUrl,
  openSource,
  locale,
}: {
  sideLabel: string;
  observation: ClaimRecordComparison["claim"];
  sourceUrl: string | null;
  openSource: string;
  locale: Locale;
}) {
  return (
    <div className={styles.side}>
      <span className={styles.sideLabel}>{sideLabel}</span>
      <strong lang={locale}>
        {localizedComparisonText(observation.label, locale)}
      </strong>
      <span className={styles.sideValue} lang={locale}>
        {localizedComparisonText(observation.value, locale) || "—"}
      </span>
      <small className={styles.sideSource}>
        {observation.source_name}
        {sourceUrl ? (
          <a href={sourceUrl} target="_blank" rel="noreferrer">
            {openSource}
          </a>
        ) : null}
      </small>
    </div>
  );
}
