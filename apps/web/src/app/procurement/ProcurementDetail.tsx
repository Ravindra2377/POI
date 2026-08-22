"use client";

import Link from "next/link";
import { useLocale } from "@/components/LocaleProvider";
import { getCopyLabels } from "@/lib/copy-helper";
import { PageFooter } from "@/components/PageFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { RecordWatchControl } from "@/components/RecordWatchControl";
import {
  formatContractValue,
  localizedProcurementText,
  type ProcurementRecord,
} from "@/lib/procurement";
import { OfficialProcurementClaim } from "./OfficialProcurementClaim";
import styles from "./procurement.module.css";

const copy = {
  en: {
    back: "← All procurement",
    eyebrow: "ANDHRA PRADESH · PROCUREMENT RECORD",
    unavailable: "Procurement record unavailable",
    unavailableText:
      "No reviewed, source-backed procurement record is published at this address. The address alone does not establish that a tender, contract or contractor exists.",
    prepared: "Prepared-data status",
    overview: "Official overview",
    details: "Official procurement details",
    observation: "Observation",
    description: "Description",
    districts: "District coverage",
    department: "Department",
    stageLabel: "Procurement stage",
    contractorLabel: "Contractor",
    contractorUnavailable: "Contractor not published in this reviewed record",
    contractValue: "Contract value",
    contractValueUnavailable:
      "Contract value not published in this reviewed record. No demonstration figure is shown.",
    tenderReference: "Tender reference",
    tenderReferenceUnavailable: "Tender reference not stated in source",
  },
  te: {
    back: "← అన్ని కొనుగోళ్లు",
    eyebrow: "ఆంధ్రప్రదేశ్ · కొనుగోలు రికార్డు",
    unavailable: "కొనుగోలు రికార్డు అందుబాటులో లేదు",
    unavailableText:
      "ఈ చిరునామాలో సమీక్షించిన, మూలాధారంతో కూడిన కొనుగోలు రికార్డు ప్రచురించబడలేదు. ఈ చిరునామా మాత్రమే టెండర్, కాంట్రాక్టు లేదా కాంట్రాక్టర్ ఉందని నిర్ధారించదు.",
    prepared: "సిద్ధం చేసిన డేటా స్థితి",
    overview: "అధికారిక అవలోకనం",
    details: "అధికారిక కొనుగోలు వివరాలు",
    observation: "పరిశీలన",
    description: "వివరణ",
    districts: "జిల్లా పరిధి",
    department: "శాఖ",
    stageLabel: "కొనుగోలు దశ",
    contractorLabel: "కాంట్రాక్టర్",
    contractorUnavailable:
      "ఈ సమీక్షించిన రికార్డులో కాంట్రాక్టర్ ప్రచురించబడలేదు",
    contractValue: "కాంట్రాక్టు విలువ",
    contractValueUnavailable:
      "ఈ సమీక్షించిన రికార్డులో కాంట్రాక్టు విలువ ప్రచురించబడలేదు. ప్రదర్శన గణాంకం చూపబడదు.",
    tenderReference: "టెండర్ సూచన",
    tenderReferenceUnavailable: "మూలంలో టెండర్ సూచన పేర్కొనలేదు",
  },
} as const;

export function ProcurementDetail({
  record,
  requestedSlug,
}: {
  record: ProcurementRecord | null;
  requestedSlug: string;
}) {
  const { locale } = useLocale();
  const labels = getCopyLabels(copy, locale);

  return (
    <>
      <SiteHeader />
      <main id="main-content">
        <header className={`page-intro shell ${styles.detailHeader}`}>
          <Link className={styles.backLink} href="/procurement">
            {labels.back}
          </Link>
          <p className="eyebrow">{labels.eyebrow}</p>
          {record ? (
            <OfficialProcurementClaim
              label={labels.observation}
              source={record.title.source}
            >
              <h1 lang={locale}>
                {localizedProcurementText(record.title.value, locale)}
              </h1>
            </OfficialProcurementClaim>
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
                id: "procurement:" + record.slug,
                kind: "procurement",
                title: localizedProcurementText(record.title.value, locale),
                href: "/procurement/" + record.slug,
              }}
            />
          )}
        </header>
        {record && (
          <section className="section shell">
            <div className={styles.detailGrid}>
              <div>
                <h2>{labels.overview}</h2>
                <OfficialProcurementClaim
                  label={labels.description}
                  source={record.description.source}
                >
                  <p lang={locale}>
                    {localizedProcurementText(record.description.value, locale)}
                  </p>
                </OfficialProcurementClaim>
              </div>
              <div>
                <h2>{labels.details}</h2>
                <div className={styles.detailClaims}>
                  <OfficialProcurementClaim
                    label={labels.stageLabel}
                    source={record.stage.source}
                  >
                    {localizedProcurementText(record.stage.value, locale)}
                  </OfficialProcurementClaim>
                  <OfficialProcurementClaim
                    label={labels.department}
                    source={record.department.source}
                  >
                    {localizedProcurementText(record.department.value, locale)}
                  </OfficialProcurementClaim>
                  <OfficialProcurementClaim
                    label={labels.districts}
                    source={record.districts.source}
                  >
                    {record.districts.value
                      .map((district) =>
                        localizedProcurementText(district, locale),
                      )
                      .join(", ")}
                  </OfficialProcurementClaim>
                  {record.contractor ? (
                    <OfficialProcurementClaim
                      label={labels.contractorLabel}
                      source={record.contractor.source}
                    >
                      {localizedProcurementText(
                        record.contractor.value,
                        locale,
                      )}
                    </OfficialProcurementClaim>
                  ) : (
                    <div className={styles.claim}>
                      <span className={styles.claimLabel}>
                        {labels.contractorLabel}
                      </span>
                      <div className={styles.claimValue}>
                        {labels.contractorUnavailable}
                      </div>
                    </div>
                  )}
                  {record.contract_value ? (
                    <OfficialProcurementClaim
                      label={labels.contractValue}
                      source={record.contract_value.source}
                    >
                      <strong className={styles.amount}>
                        {formatContractValue(record.contract_value.value)}
                      </strong>
                    </OfficialProcurementClaim>
                  ) : (
                    <div className={styles.claim}>
                      <span className={styles.claimLabel}>
                        {labels.contractValue}
                      </span>
                      <div className={styles.claimValue}>
                        {labels.contractValueUnavailable}
                      </div>
                    </div>
                  )}
                  {record.tender_reference ? (
                    <OfficialProcurementClaim
                      label={labels.tenderReference}
                      source={record.tender_reference.source}
                    >
                      {localizedProcurementText(
                        record.tender_reference.value,
                        locale,
                      )}
                    </OfficialProcurementClaim>
                  ) : (
                    <div className={styles.claim}>
                      <span className={styles.claimLabel}>
                        {labels.tenderReference}
                      </span>
                      <div className={styles.claimValue}>
                        {labels.tenderReferenceUnavailable}
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
