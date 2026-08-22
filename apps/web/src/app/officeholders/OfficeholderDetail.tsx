"use client";

import Link from "next/link";
import { useLocale } from "@/components/LocaleProvider";
import { getCopyLabels } from "@/lib/copy-helper";
import { PageFooter } from "@/components/PageFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { RecordWatchControl } from "@/components/RecordWatchControl";
import {
  localizedOfficeholderText,
  type OfficeholderRecord,
} from "@/lib/officeholders";
import { OfficialOfficeholderClaim } from "./OfficialOfficeholderClaim";
import styles from "./officeholders.module.css";

const copy = {
  en: {
    back: "← All officeholders",
    eyebrow: "ANDHRA PRADESH · OFFICEHOLDER RECORD",
    unavailable: "Officeholder record unavailable",
    unavailableText:
      "No reviewed, source-backed officeholder record is published at this address. The address alone does not establish that a person, role or term exists.",
    prepared: "Prepared-data status",
    overview: "Official overview",
    details: "Official term details",
    observation: "Observation",
    description: "Description",
    districts: "District coverage",
    holder: "Officeholder",
    officeLabel: "Office",
    bodyLabel: "Government body",
    termStart: "Term start",
    termEnd: "Term end",
    termEndUnavailable: "Term end not stated in source",
  },
  te: {
    back: "← అన్ని అధికారులు",
    eyebrow: "ఆంధ్రప్రదేశ్ · అధికారి రికార్డు",
    unavailable: "అధికారి రికార్డు అందుబాటులో లేదు",
    unavailableText:
      "ఈ చిరునామాలో సమీక్షించిన, మూలాధారంతో కూడిన అధికారి రికార్డు ప్రచురించబడలేదు. ఈ చిరునామా మాత్రమే వ్యక్తి, పాత్ర లేదా పదవీ కాలం ఉందని నిర్ధారించదు.",
    prepared: "సిద్ధం చేసిన డేటా స్థితి",
    overview: "అధికారిక అవలోకనం",
    details: "అధికారిక పదవీ కాల వివరాలు",
    observation: "పరిశీలన",
    description: "వివరణ",
    districts: "జిల్లా పరిధి",
    holder: "అధికారి",
    officeLabel: "కార్యాలయం",
    bodyLabel: "ప్రభుత్వ సంస్థ",
    termStart: "పదవీ కాలం ప్రారంభం",
    termEnd: "పదవీ కాలం ముగింపు",
    termEndUnavailable: "మూలంలో పదవీ కాల ముగింపు పేర్కొనలేదు",
  },
} as const;

export function OfficeholderDetail({
  record,
  requestedSlug,
}: {
  record: OfficeholderRecord | null;
  requestedSlug: string;
}) {
  const { locale } = useLocale();
  const labels = getCopyLabels(copy, locale);

  return (
    <>
      <SiteHeader />
      <main id="main-content">
        <header className={`page-intro shell ${styles.detailHeader}`}>
          <Link className={styles.backLink} href="/officeholders">
            {labels.back}
          </Link>
          <p className="eyebrow">{labels.eyebrow}</p>
          {record ? (
            <OfficialOfficeholderClaim
              label={labels.observation}
              source={record.title.source}
            >
              <h1 lang={locale}>
                {localizedOfficeholderText(record.title.value, locale)}
              </h1>
            </OfficialOfficeholderClaim>
          ) : (
            <>
              <h1>{labels.unavailable}</h1>
              <p className="lede">{labels.unavailableText}</p>
              <p className={styles.unavailableSlug}>
                {labels.prepared}: {requestedSlug}
              </p>
            </>
          )}
          {record && (
            <RecordWatchControl
              record={{
                id: "officeholder:" + record.slug,
                kind: "officeholder",
                title: localizedOfficeholderText(record.title.value, locale),
                href: "/officeholders/" + record.slug,
              }}
            />
          )}
        </header>
        {record && (
          <section className="section shell">
            <div className={styles.detailGrid}>
              <div>
                <h2>{labels.overview}</h2>
                <OfficialOfficeholderClaim
                  label={labels.description}
                  source={record.description.source}
                >
                  <p lang={locale}>
                    {localizedOfficeholderText(
                      record.description.value,
                      locale,
                    )}
                  </p>
                </OfficialOfficeholderClaim>
              </div>
              <div>
                <h2>{labels.details}</h2>
                <div className={styles.detailClaims}>
                  <OfficialOfficeholderClaim
                    label={labels.holder}
                    source={record.holder.source}
                  >
                    {localizedOfficeholderText(record.holder.value, locale)}
                  </OfficialOfficeholderClaim>
                  <OfficialOfficeholderClaim
                    label={labels.officeLabel}
                    source={record.office.source}
                  >
                    {localizedOfficeholderText(record.office.value, locale)}
                  </OfficialOfficeholderClaim>
                  <OfficialOfficeholderClaim
                    label={labels.bodyLabel}
                    source={record.body.source}
                  >
                    {localizedOfficeholderText(record.body.value, locale)}
                  </OfficialOfficeholderClaim>
                  <OfficialOfficeholderClaim
                    label={labels.districts}
                    source={record.districts.source}
                  >
                    {record.districts.value
                      .map((district) =>
                        localizedOfficeholderText(district, locale),
                      )
                      .join(", ")}
                  </OfficialOfficeholderClaim>
                  <OfficialOfficeholderClaim
                    label={labels.termStart}
                    source={record.term_start.source}
                  >
                    {record.term_start.value}
                  </OfficialOfficeholderClaim>
                  {record.term_end ? (
                    <OfficialOfficeholderClaim
                      label={labels.termEnd}
                      source={record.term_end.source}
                    >
                      {record.term_end.value}
                    </OfficialOfficeholderClaim>
                  ) : (
                    <div className={styles.claim}>
                      <span className={styles.claimLabel}>
                        {labels.termEnd}
                      </span>
                      <div className={styles.claimValue}>
                        {labels.termEndUnavailable}
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
