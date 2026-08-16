"use client";

import Link from "next/link";
import { useLocale } from "@/components/LocaleProvider";
import { PageFooter } from "@/components/PageFooter";
import { SiteHeader } from "@/components/SiteHeader";
import {
  formatRupees,
  localizedBudgetText,
  type BudgetLine,
} from "@/lib/budget";
import { OfficialBudgetClaim } from "./OfficialBudgetClaim";
import styles from "./budget.module.css";

const copy = {
  en: {
    back: "← All budget lines",
    eyebrow: "ANDHRA PRADESH · BUDGET LINE RECORD",
    unavailable: "Budget line record unavailable",
    unavailableText:
      "No reviewed, source-backed budget line is published at this address. The address alone does not establish that a major head, figure or unit exists.",
    prepared: "Prepared-data status",
    overview: "Official overview",
    details: "Official line details",
    observation: "Observation",
    budgetEstimate: "Budget estimate",
    amountColumns: "Amount columns",
    amountNote:
      "Value is the raw token transcribed from the official statement; rupees is that token decoded to whole rupees using the statement's declared unit.",
    unitLabel: "Unit",
    fiscalYearLabel: "Fiscal year",
    statementLabel: "Statement",
    codeLabel: "Major head code",
    value: "Value",
    rupees: "Rupees",
  },
  te: {
    back: "← అన్ని బడ్జెట్ లైన్లు",
    eyebrow: "ఆంధ్రప్రదేశ్ · బడ్జెట్ లైన్ రికార్డు",
    unavailable: "బడ్జెట్ లైన్ రికార్డు అందుబాటులో లేదు",
    unavailableText:
      "ఈ చిరునామాలో సమీక్షించిన, మూలాధారంతో కూడిన బడ్జెట్ లైన్ ప్రచురించబడలేదు. ఈ చిరునామా మాత్రమే ముఖ్య శీర్షిక, గణాంకం లేదా యూనిట్ ఉందని నిర్ధారించదు.",
    prepared: "సిద్ధం చేసిన డేటా స్థితి",
    overview: "అధికారిక అవలోకనం",
    details: "అధికారిక లైన్ వివరాలు",
    observation: "పరిశీలన",
    budgetEstimate: "బడ్జెట్ అంచనా",
    amountColumns: "మొత్తాల నిలువు వరుసలు",
    amountNote:
      "విలువ అనేది అధికారిక ప్రకటన నుండి లిప్యంతరీకరించిన ముడి గుర్తు; రూపాయలు అనేది ప్రకటన యొక్క ప్రకటించిన యూనిట్ ఉపయోగించి పూర్తి రూపాయలకు మార్చబడిన గుర్తు.",
    unitLabel: "యూనిట్",
    fiscalYearLabel: "ఆర్థిక సంవత్సరం",
    statementLabel: "ప్రకటన",
    codeLabel: "ముఖ్య శీర్షిక కోడ్",
    value: "విలువ",
    rupees: "రూపాయలు",
  },
} as const;

export function BudgetDetail({
  line,
  requestedSlug,
}: {
  line: BudgetLine | null;
  requestedSlug: string;
}) {
  const { locale } = useLocale();
  const labels = copy[locale];

  return (
    <>
      <SiteHeader />
      <main id="main-content">
        <header className={`page-intro shell ${styles.detailHeader}`}>
          <Link className={styles.backLink} href="/budget">
            {labels.back}
          </Link>
          <p className="eyebrow">{labels.eyebrow}</p>
          {line ? (
            <OfficialBudgetClaim
              label={labels.observation}
              source={line.name.source}
            >
              <h1 lang={locale}>
                {localizedBudgetText(line.name.value, locale)}
              </h1>
            </OfficialBudgetClaim>
          ) : (
            <>
              <h1>{labels.unavailable}</h1>
              <p className="lede">{labels.unavailableText}</p>
              <p className={styles.unavailableSlug}>
                {labels.prepared}: {requestedSlug}
              </p>
            </>
          )}
        </header>
        {line && (
          <section className="section shell">
            <div className={styles.detailGrid}>
              <div>
                <h2>{labels.overview}</h2>
                <OfficialBudgetClaim
                  label={labels.budgetEstimate}
                  source={line.budget_estimate.source}
                >
                  <p lang={locale}>
                    {localizedBudgetText(line.budget_estimate.value, locale)}{" "}
                    {line.unit}
                  </p>
                </OfficialBudgetClaim>
              </div>
              <div>
                <h2>{labels.details}</h2>
                <div className={styles.detailClaims}>
                  <OfficialBudgetClaim
                    label={labels.fiscalYearLabel}
                    source={line.source}
                  >
                    {line.fiscal_year}
                  </OfficialBudgetClaim>
                  <OfficialBudgetClaim
                    label={labels.statementLabel}
                    source={line.source}
                  >
                    {line.statement}
                  </OfficialBudgetClaim>
                  <OfficialBudgetClaim
                    label={labels.codeLabel}
                    source={line.source}
                  >
                    {line.code}
                  </OfficialBudgetClaim>
                  <OfficialBudgetClaim
                    label={labels.unitLabel}
                    source={line.source}
                  >
                    {line.unit}
                  </OfficialBudgetClaim>
                </div>
                <div className={styles.amounts}>
                  <h3>{labels.amountColumns}</h3>
                  <p className={styles.amountNote}>{labels.amountNote}</p>
                  <table>
                    <thead>
                      <tr>
                        <th scope="col">{labels.unitLabel}</th>
                        <th scope="col">{labels.value}</th>
                        <th scope="col">{labels.rupees}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {line.amounts.map((amount) => (
                        <tr key={`${line.slug}-${amount.label}`}>
                          <td>{amount.label}</td>
                          <td>{amount.value_text}</td>
                          <td>{formatRupees(amount.rupees)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className={styles.provenance}>
                    <span>Official · Reviewed</span>
                    <a
                      href={
                        line.source.public_source_url ??
                        line.source.official_source_url
                      }
                      target="_blank"
                      rel="noreferrer"
                    >
                      {line.source.source_name}
                    </a>
                    <small>
                      SourceRecord · retrieved {line.source.retrieval_date}
                    </small>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>
      <PageFooter />
    </>
  );
}
