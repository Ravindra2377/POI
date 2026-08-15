"use client";

import Link from "next/link";
import { useLocale } from "@/components/LocaleProvider";
import { PageFooter } from "@/components/PageFooter";
import { SiteHeader } from "@/components/SiteHeader";
import {
  formatMoneyAmount,
  localizedMoneyText,
  type PublicMoneyRecord,
} from "@/lib/public-money";
import { OfficialMoneyClaim } from "./OfficialMoneyClaim";
import styles from "./public-money.module.css";

const copy = {
  en: {
    back: "← All public money",
    eyebrow: "ANDHRA PRADESH · PUBLIC MONEY RECORD",
    unavailable: "Public-money record unavailable",
    unavailableText:
      "No reviewed, source-backed financial record is published at this address. The address alone does not establish that a figure, stage or amount exists.",
    prepared: "Prepared-data status",
    overview: "Official overview",
    details: "Official financial details",
    observation: "Observation",
    description: "Description",
    stage: "Financial stage",
    department: "Department",
    districts: "District coverage",
    reportingPeriod: "Reporting period",
    reportingUnavailable: "Reporting period not stated in source",
    amountLabel: "Amount",
    amountUnavailable:
      "Amount not published in this reviewed record. No demonstration figure is shown.",
  },
  te: {
    back: "← అన్ని ప్రజా ధనం",
    eyebrow: "ఆంధ్రప్రదేశ్ · ప్రజా ధన రికార్డు",
    unavailable: "ప్రజా ధన రికార్డు అందుబాటులో లేదు",
    unavailableText:
      "ఈ చిరునామాలో సమీక్షించిన, మూలాధారంతో కూడిన ఆర్థిక రికార్డు ప్రచురించబడలేదు. ఈ చిరునామా మాత్రమే గణాంకం, దశ లేదా మొత్తం ఉందని నిర్ధారించదు.",
    prepared: "సిద్ధం చేసిన డేటా స్థితి",
    overview: "అధికారిక అవలోకనం",
    details: "అధికారిక ఆర్థిక వివరాలు",
    observation: "పరిశీలన",
    description: "వివరణ",
    stage: "ఆర్థిక దశ",
    department: "శాఖ",
    districts: "జిల్లా పరిధి",
    reportingPeriod: "రిపోర్టింగ్ వ్యవధి",
    reportingUnavailable: "మూలంలో రిపోర్టింగ్ వ్యవధి పేర్కొనలేదు",
    amountLabel: "మొత్తం",
    amountUnavailable:
      "ఈ సమీక్షించిన రికార్డులో మొత్తం ప్రచురించబడలేదు. ప్రదర్శన గణాంకం చూపబడదు.",
  },
} as const;

export function PublicMoneyDetail({
  record,
  requestedSlug,
}: {
  record: PublicMoneyRecord | null;
  requestedSlug: string;
}) {
  const { locale } = useLocale();
  const labels = copy[locale];

  return (
    <>
      <SiteHeader />
      <main id="main-content">
        <header className={`page-intro shell ${styles.detailHeader}`}>
          <Link className={styles.backLink} href="/public-money">
            {labels.back}
          </Link>
          <p className="eyebrow">{labels.eyebrow}</p>
          {record ? (
            <OfficialMoneyClaim
              label={labels.observation}
              source={record.title.source}
            >
              <h1 lang={locale}>
                {localizedMoneyText(record.title.value, locale)}
              </h1>
            </OfficialMoneyClaim>
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
        {record && (
          <section className="section shell">
            <div className={styles.detailGrid}>
              <div>
                <h2>{labels.overview}</h2>
                <OfficialMoneyClaim
                  label={labels.description}
                  source={record.description.source}
                >
                  <p lang={locale}>
                    {localizedMoneyText(record.description.value, locale)}
                  </p>
                </OfficialMoneyClaim>
              </div>
              <div>
                <h2>{labels.details}</h2>
                <div className={styles.detailClaims}>
                  <OfficialMoneyClaim
                    label={labels.stage}
                    source={record.stage.source}
                  >
                    {localizedMoneyText(record.stage.value, locale)}
                  </OfficialMoneyClaim>
                  <OfficialMoneyClaim
                    label={labels.department}
                    source={record.department.source}
                  >
                    {localizedMoneyText(record.department.value, locale)}
                  </OfficialMoneyClaim>
                  <OfficialMoneyClaim
                    label={labels.districts}
                    source={record.districts.source}
                  >
                    {record.districts.value
                      .map((district) => localizedMoneyText(district, locale))
                      .join(", ")}
                  </OfficialMoneyClaim>
                  {record.reporting_period ? (
                    <OfficialMoneyClaim
                      label={labels.reportingPeriod}
                      source={record.reporting_period.source}
                    >
                      {localizedMoneyText(
                        record.reporting_period.value,
                        locale,
                      )}
                    </OfficialMoneyClaim>
                  ) : (
                    <div className={styles.claim}>
                      <span className={styles.claimLabel}>
                        {labels.reportingPeriod}
                      </span>
                      <div className={styles.claimValue}>
                        {labels.reportingUnavailable}
                      </div>
                    </div>
                  )}
                  {record.amount ? (
                    <OfficialMoneyClaim
                      label={labels.amountLabel}
                      source={record.amount.source}
                    >
                      <strong className={styles.amount}>
                        {formatMoneyAmount(record.amount.value)}
                      </strong>
                    </OfficialMoneyClaim>
                  ) : (
                    <div className={styles.claim}>
                      <span className={styles.claimLabel}>
                        {labels.amountLabel}
                      </span>
                      <div className={styles.claimValue}>
                        {labels.amountUnavailable}
                      </div>
                    </div>
                  )}
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
