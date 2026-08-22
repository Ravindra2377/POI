"use client";

import Link from "next/link";
import { PageFooter } from "@/components/PageFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { RecordWatchControl } from "@/components/RecordWatchControl";
import { useLocale } from "@/components/LocaleProvider";
import { getCopyLabels } from "@/lib/copy-helper";
import { useSelectedState } from "@/components/StateProvider";
import { localized, type SchemeRecord } from "@/lib/schemes";
import { OfficialClaim } from "./OfficialClaim";
import styles from "./schemes.module.css";

const copy = {
  en: {
    back: "← All schemes",
    eyebrow: "SCHEME RECORD",
    unavailable: "Scheme record unavailable",
    unavailableText:
      "No reviewed, source-backed scheme record is published at this address. The address alone does not establish that a scheme exists or does not exist.",
    prepared: "Prepared-data status",
    teluguNotice:
      "Telugu labels are not yet reviewed for this record; English values are shown.",
    overview: "Official overview",
    details: "Official details",
    name: "Scheme name",
    description: "Description",
    department: "Department",
    districts: "District coverage",
    category: "Category",
    eligibility: "Eligibility criteria",
    eligibilityUnavailable:
      "Eligibility criteria are unavailable in this reviewed record. This page cannot determine personal eligibility.",
    notPublished: "Not published in this reviewed record",
  },
  te: {
    back: "← అన్ని పథకాలు",
    eyebrow: "పథకం రికార్డు",
    unavailable: "పథకం రికార్డు అందుబాటులో లేదు",
    unavailableText:
      "ఈ చిరునామాలో సమీక్షించిన, మూలాధారంతో కూడిన పథకం రికార్డు ప్రచురించబడలేదు. ఈ చిరునామా మాత్రమే పథకం ఉందని లేదా లేదని నిర్ధారించదు.",
    prepared: "సిద్ధం చేసిన డేటా స్థితి",
    teluguNotice:
      "ఈ రికార్డుకు తెలుగు లేబుళ్లు ఇంకా సమీక్షించబడలేదు; ఇంగ్లీషు విలువలు చూపబడతాయి.",
    overview: "అధికారిక అవలోకనం",
    details: "అధికారిక వివరాలు",
    name: "పథకం పేరు",
    description: "వివరణ",
    department: "శాఖ",
    districts: "జిల్లా పరిధి",
    category: "వర్గం",
    eligibility: "అర్హత ప్రమాణాలు",
    eligibilityUnavailable:
      "ఈ సమీక్షించిన రికార్డులో అర్హత ప్రమాణాలు అందుబాటులో లేవు. ఈ పేజీ వ్యక్తిగత అర్హతను నిర్ణయించదు.",
    notPublished: "ఈ సమీక్షించిన రికార్డులో ప్రచురించబడలేదు",
  },
} as const;

export function SchemeDetail({
  scheme,
  requestedSlug,
  teluguReviewed = false,
}: {
  scheme: SchemeRecord | null;
  requestedSlug: string;
  teluguReviewed?: boolean;
}) {
  const { locale } = useLocale();
  const { selectedState } = useSelectedState();
  const labels = getCopyLabels(copy, locale);

  return (
    <>
      <SiteHeader />
      <main id="main-content">
        <header className={`page-intro shell ${styles.detailHeader}`}>
          <Link
            className={styles.backLink}
            href={`/schemes?state=${encodeURIComponent(selectedState.iso_code)}`}
          >
            {labels.back}
          </Link>
          <p className="eyebrow">
            {selectedState.name_en.toUpperCase()} · {labels.eyebrow}
          </p>
          {scheme ? (
            <OfficialClaim label={labels.name} source={scheme.name.source}>
              <h1 lang={locale}>{localized(scheme.name.value, locale)}</h1>
            </OfficialClaim>
          ) : (
            <>
              <h1>{labels.unavailable}</h1>
              <p className="lede">{labels.unavailableText}</p>
              <p className={styles.unavailableSlug}>
                {labels.prepared}: {requestedSlug}
              </p>
            </>
          )}
          {scheme && (
            <RecordWatchControl
              record={{
                id: "scheme:" + scheme.slug,
                kind: "scheme",
                title: localized(scheme.name.value, locale),
                href:
                  "/schemes/" +
                  scheme.slug +
                  "?state=" +
                  encodeURIComponent(selectedState.iso_code),
              }}
            />
          )}
        </header>

        {scheme && (
          <section className="section shell">
            {!teluguReviewed && (
              <aside className={styles.notice} aria-label={labels.teluguNotice}>
                <strong>{labels.teluguNotice}</strong>
              </aside>
            )}
            <div className={styles.detailGrid}>
              <div>
                <h2>{labels.overview}</h2>
                <OfficialClaim
                  label={labels.description}
                  source={scheme.description.source}
                >
                  <p lang={locale}>
                    {localized(scheme.description.value, locale)}
                  </p>
                </OfficialClaim>
              </div>
              <div>
                <h2>{labels.details}</h2>
                <div className={styles.detailClaims}>
                  {scheme.department !== null ? (
                    <OfficialClaim
                      label={labels.department}
                      source={scheme.department.source}
                    >
                      {localized(scheme.department.value, locale)}
                    </OfficialClaim>
                  ) : (
                    <div className={styles.claim}>
                      <span className={styles.claimLabel}>
                        {labels.department}
                      </span>
                      <div className={styles.claimValue}>
                        {labels.notPublished}
                      </div>
                    </div>
                  )}
                  {scheme.districts !== null ? (
                    <OfficialClaim
                      label={labels.districts}
                      source={scheme.districts.source}
                    >
                      {scheme.districts.value
                        .map((district) => localized(district, locale))
                        .join(", ")}
                    </OfficialClaim>
                  ) : (
                    <div className={styles.claim}>
                      <span className={styles.claimLabel}>
                        {labels.districts}
                      </span>
                      <div className={styles.claimValue}>
                        {labels.notPublished}
                      </div>
                    </div>
                  )}
                  <OfficialClaim
                    label={labels.category}
                    source={scheme.category.source}
                  >
                    {localized(scheme.category.value, locale)}
                  </OfficialClaim>
                  {scheme.eligibility ? (
                    <OfficialClaim
                      label={labels.eligibility}
                      source={scheme.eligibility.source}
                    >
                      <ul>
                        {scheme.eligibility.value.map((criterion) => (
                          <li key={criterion.en} lang={locale}>
                            {localized(criterion, locale)}
                          </li>
                        ))}
                      </ul>
                    </OfficialClaim>
                  ) : (
                    <div className={styles.claim}>
                      <span className={styles.claimLabel}>
                        {labels.eligibility}
                      </span>
                      <div className={styles.claimValue}>
                        {labels.eligibilityUnavailable}
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
