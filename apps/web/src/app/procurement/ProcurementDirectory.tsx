"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ProcurementStageSelector } from "@/components/ProcurementStageSelector";
import type { Locale } from "@/lib/catalog-types";
import { useLocale } from "@/components/LocaleProvider";
import { useSelectedState } from "@/components/StateProvider";
import { ApOnlyCatalogNotice } from "@/components/ApOnlyCatalogNotice";
import { PageFooter } from "@/components/PageFooter";
import { SiteHeader } from "@/components/SiteHeader";
import {
  filterProcurement,
  formatContractValue,
  getProcurement,
  localizedProcurementText,
  type ProcurementFilters,
  type ProcurementLocalizedText,
  type ProcurementRecord,
} from "@/lib/procurement";
import { OfficialProcurementClaim } from "./OfficialProcurementClaim";
import styles from "./procurement.module.css";

const copy = {
  en: {
    eyebrow: "PREPARED DIRECTORY",
    title: "Procurement",
    intro:
      "A source-first directory for reviewed tender and contract observations.",
    prepared: "Prepared directory · No reviewed procurement records",
    preparedText:
      "The routes and filters are ready. No tender, contract value or contractor is published until source and bilingual review is complete.",
    ruleEstimate: "Tender estimate is not contract value.",
    ruleAward: "Contract award is not public outcome.",
    chainEyebrow: "PROCUREMENT CHAIN",
    chainTitle: "Seven stages, kept distinct",
    chainNote:
      "Each stage keeps its own meaning and source. No demonstration value is presented as production data.",
    filters: "Filter reviewed procurement records",
    stage: "Stage",
    department: "Department",
    district: "District",
    contractor: "Contractor information",
    allStages: "All stages",
    allDepartments: "All departments",
    allDistricts: "All districts",
    contractorAll: "All records",
    contractorNamed: "Contractor published",
    contractorUndisclosed: "Contractor undisclosed",
    loading: "Loading the reviewed procurement catalogue…",
    emptyTitle: "No reviewed procurement records are published yet",
    emptyText:
      "This is an intentionally empty prepared-data state, not a claim that Andhra Pradesh publishes no procurement records.",
    noMatchTitle: "No reviewed procurement records match these filters",
    noMatchText: "Change one or more filters to see other reviewed records.",
    errorTitle: "Procurement records could not be loaded",
    errorText:
      "The prepared catalogue is temporarily unavailable. No contract value is being substituted.",
    retry: "Retry",
    observation: "Observation",
    description: "Description",
    districts: "District coverage",
    stageLabel: "Procurement stage",
    contractorLabel: "Contractor",
    contractorUnavailable: "Contractor not published in this reviewed record",
    contractValue: "Contract value",
    contractValueUnavailable:
      "Contract value not published in this reviewed record",
    tenderReference: "Tender reference",
    tenderReferenceUnavailable: "Tender reference not stated in source",
  },
  te: {
    eyebrow: "ఆంధ్రప్రదేశ్ · సిద్ధం చేసిన డైరెక్టరీ",
    title: "ఆంధ్రప్రదేశ్ కొనుగోళ్లు",
    intro:
      "సమీక్షించిన టెండర్ మరియు కాంట్రాక్టు పరిశీలనల కోసం మూలాధార-కేంద్రీకృత డైరెక్టరీ.",
    prepared: "సిద్ధం చేసిన డైరెక్టరీ · సమీక్షించిన కొనుగోలు రికార్డులు లేవు",
    preparedText:
      "మార్గాలు, ఫిల్టర్లు సిద్ధంగా ఉన్నాయి. మూలం మరియు ద్విభాషా సమీక్ష పూర్తయ్యే వరకు టెండర్, కాంట్రాక్టు విలువ లేదా కాంట్రాక్టర్ ప్రచురించబడదు.",
    ruleEstimate: "టెండర్ అంచనా కాంట్రాక్టు విలువ కాదు.",
    ruleAward: "కాంట్రాక్టు అవార్డు ప్రజా ఫలితం కాదు.",
    chainEyebrow: "కొనుగోలు గొలుసు",
    chainTitle: "ఏడు దశలు, విడివిడిగా ఉంచబడ్డాయి",
    chainNote:
      "ప్రతి దశ దాని స్వంత అర్థం మరియు మూలాన్ని కలిగి ఉంటుంది. ఉత్పత్తి డేటాగా ఎటువంటి ప్రదర్శన విలువ చూపబడదు.",
    filters: "సమీక్షించిన కొనుగోలు రికార్డులను ఫిల్టర్ చేయండి",
    stage: "దశ",
    department: "శాఖ",
    district: "జిల్లా",
    contractor: "కాంట్రాక్టర్ సమాచారం",
    allStages: "అన్ని దశలు",
    allDepartments: "అన్ని శాఖలు",
    allDistricts: "అన్ని జిల్లాలు",
    contractorAll: "అన్ని రికార్డులు",
    contractorNamed: "కాంట్రాక్టర్ ప్రచురించబడింది",
    contractorUndisclosed: "కాంట్రాక్టర్ తెలియజేయబడలేదు",
    loading: "సమీక్షించిన కొనుగోలు జాబితా లోడ్ అవుతోంది…",
    emptyTitle: "సమీక్షించిన కొనుగోలు రికార్డులు ఇంకా ప్రచురించబడలేదు",
    emptyText:
      "ఇది ఉద్దేశపూర్వకంగా ఖాళీగా ఉన్న సిద్ధం చేసిన డేటా స్థితి; ఆంధ్రప్రదేశ్‌లో కొనుగోలు రికార్డులు లేవని చెప్పడం కాదు.",
    noMatchTitle: "ఈ ఫిల్టర్లకు సరిపోలే సమీక్షించిన కొనుగోలు రికార్డులు లేవు",
    noMatchText: "ఇతర సమీక్షించిన రికార్డుల కోసం ఫిల్టర్లను మార్చండి.",
    errorTitle: "కొనుగోలు రికార్డులను లోడ్ చేయలేకపోయాము",
    errorText:
      "సిద్ధం చేసిన జాబితా తాత్కాలికంగా అందుబాటులో లేదు. ప్రత్యామ్నాయ కాంట్రాక్టు విలువ చూపబడదు.",
    retry: "మళ్లీ ప్రయత్నించండి",
    observation: "పరిశీలన",
    description: "వివరణ",
    districts: "జిల్లా పరిధి",
    stageLabel: "కొనుగోలు దశ",
    contractorLabel: "కాంట్రాక్టర్",
    contractorUnavailable:
      "ఈ సమీక్షించిన రికార్డులో కాంట్రాక్టర్ ప్రచురించబడలేదు",
    contractValue: "కాంట్రాక్టు విలువ",
    contractValueUnavailable:
      "ఈ సమీక్షించిన రికార్డులో కాంట్రాక్టు విలువ ప్రచురించబడలేదు",
    tenderReference: "టెండర్ సూచన",
    tenderReferenceUnavailable: "మూలంలో టెండర్ సూచన పేర్కొనలేదు",
  },
} as const;

const initialFilters: ProcurementFilters = {
  stage: "",
  department: "",
  district: "",
  contractor: "all",
};

function uniqueClaims(
  records: ProcurementRecord[],
  select: (record: ProcurementRecord) => ProcurementLocalizedText[],
): ProcurementLocalizedText[] {
  const values = new Map<string, ProcurementLocalizedText>();
  records.forEach((record) =>
    select(record).forEach((value) => values.set(value.en, value)),
  );
  return [...values.values()].sort((a, b) => a.en.localeCompare(b.en));
}

function getCopyLabels<T>(copyObj: Record<string, T>, loc: string): T {
  return copyObj[loc] ?? copyObj.en;
}

export function ProcurementDirectory() {
  const { locale } = useLocale();
  const { selectedState, selectedStateIso } = useSelectedState();
  const labels = getCopyLabels(copy, locale);
  const apOnly = selectedStateIso === "IN-AP";
  const [records, setRecords] = useState<ProcurementRecord[]>([]);
  const [filters, setFilters] = useState<ProcurementFilters>(initialFilters);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  async function load(signal?: AbortSignal) {
    setState("loading");
    try {
      const response = await getProcurement(signal);
      setRecords(response.data);
      setState("ready");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setRecords([]);
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

  const stages = uniqueClaims(records, (record) => [record.stage.value]);
  const departments = uniqueClaims(records, (record) => [
    record.department.value,
  ]);
  const districts = uniqueClaims(records, (record) => record.districts.value);
  const filtered = filterProcurement(records, filters);

  function selectFilter<Key extends keyof ProcurementFilters>(
    key: Key,
    value: ProcurementFilters[Key],
  ) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  return (
    <>
      <SiteHeader />
      <main id="main-content">
        <header className="page-intro shell">
          <p className="eyebrow">
            {selectedState.name_en.toUpperCase()} · {labels.eyebrow}
          </p>
          <h1>
            {selectedState.name_en} {labels.title}
          </h1>
          <p className="lede">{labels.intro}</p>
          <aside className={styles.notice} aria-label={labels.prepared}>
            <strong>{labels.prepared}</strong>
            <p>{labels.preparedText}</p>
          </aside>
        </header>

        <section className="money-rules">
          <div className="shell money-rules__grid">
            <strong>{labels.ruleEstimate}</strong>
            <strong>{labels.ruleAward}</strong>
          </div>
        </section>

        <section
          className="section shell"
          aria-labelledby="procurement-stages-heading"
        >
          <div className="section-heading section-heading--split">
            <div>
              <p className="eyebrow">{labels.chainEyebrow}</p>
              <h2 id="procurement-stages-heading">{labels.chainTitle}</h2>
            </div>
            <p>{labels.chainNote}</p>
          </div>
          <ProcurementStageSelector />
        </section>

        <section
          className="section shell"
          aria-labelledby="procurement-results"
        >
          <h2 className="sr-only" id="procurement-results">
            {labels.title}
          </h2>
          {apOnly ? (
            <>
              <fieldset className={styles.filters}>
                <legend className="sr-only">{labels.filters}</legend>
                <ProcurementFilter
                  id="procurement-stage"
                  label={labels.stage}
                  allLabel={labels.allStages}
                  options={stages}
                  locale={locale}
                  value={filters.stage}
                  onChange={(value) => selectFilter("stage", value)}
                />
                <ProcurementFilter
                  id="procurement-department"
                  label={labels.department}
                  allLabel={labels.allDepartments}
                  options={departments}
                  locale={locale}
                  value={filters.department}
                  onChange={(value) => selectFilter("department", value)}
                />
                <ProcurementFilter
                  id="procurement-district"
                  label={labels.district}
                  allLabel={labels.allDistricts}
                  options={districts}
                  locale={locale}
                  value={filters.district}
                  onChange={(value) => selectFilter("district", value)}
                />
                <div>
                  <label htmlFor="procurement-contractor">
                    {labels.contractor}
                  </label>
                  <select
                    id="procurement-contractor"
                    value={filters.contractor}
                    onChange={(event) =>
                      selectFilter(
                        "contractor",
                        event.currentTarget
                          .value as ProcurementFilters["contractor"],
                      )
                    }
                  >
                    <option value="all">{labels.contractorAll}</option>
                    <option value="named">{labels.contractorNamed}</option>
                    <option value="undisclosed">
                      {labels.contractorUndisclosed}
                    </option>
                  </select>
                </div>
              </fieldset>

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
                {state === "ready" && records.length === 0 && (
                  <div className="empty-state">
                    <h3>{labels.emptyTitle}</h3>
                    <p>{labels.emptyText}</p>
                  </div>
                )}
                {state === "ready" &&
                  records.length > 0 &&
                  filtered.length === 0 && (
                    <div className="empty-state">
                      <h3>{labels.noMatchTitle}</h3>
                      <p>{labels.noMatchText}</p>
                    </div>
                  )}
                {state === "ready" && filtered.length > 0 && (
                  <ul className={styles.records}>
                    {filtered.map((record) => (
                      <li key={record.slug}>
                        <div>
                          <OfficialProcurementClaim
                            label={labels.observation}
                            source={record.title.source}
                          >
                            <h2 lang={locale}>
                              <Link href={`/procurement/${record.slug}`}>
                                {localizedProcurementText(
                                  record.title.value,
                                  locale,
                                )}
                              </Link>
                            </h2>
                          </OfficialProcurementClaim>
                          <OfficialProcurementClaim
                            label={labels.description}
                            source={record.description.source}
                          >
                            <p lang={locale}>
                              {localizedProcurementText(
                                record.description.value,
                                locale,
                              )}
                            </p>
                          </OfficialProcurementClaim>
                        </div>
                        <div className={styles.claimGrid}>
                          <OfficialProcurementClaim
                            label={labels.stageLabel}
                            source={record.stage.source}
                          >
                            {localizedProcurementText(
                              record.stage.value,
                              locale,
                            )}
                          </OfficialProcurementClaim>
                          <OfficialProcurementClaim
                            label={labels.department}
                            source={record.department.source}
                          >
                            {localizedProcurementText(
                              record.department.value,
                              locale,
                            )}
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
                                {formatContractValue(
                                  record.contract_value.value,
                                )}
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
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          ) : (
            <ApOnlyCatalogNotice jurisdiction={selectedState.name_en} />
          )}
        </section>
      </main>
      <PageFooter />
    </>
  );
}

function ProcurementFilter({
  id,
  label,
  allLabel,
  options,
  locale,
  value,
  onChange,
}: {
  id: string;
  label: string;
  allLabel: string;
  options: ProcurementLocalizedText[];
  locale: Locale;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
      >
        <option value="">{allLabel}</option>
        {options.map((option) => (
          <option key={option.en} value={option.en}>
            {localizedProcurementText(option, locale)}
          </option>
        ))}
      </select>
    </div>
  );
}
