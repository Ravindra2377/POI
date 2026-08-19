"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FinancialStageSelector } from "@/components/FinancialStageSelector";
import type { Locale } from "@/lib/catalog-types";
import { useLocale } from "@/components/LocaleProvider";
import { useSelectedState } from "@/components/StateProvider";
import { ApOnlyCatalogNotice } from "@/components/ApOnlyCatalogNotice";
import { PageFooter } from "@/components/PageFooter";
import { SiteHeader } from "@/components/SiteHeader";
import {
  filterPublicMoney,
  formatMoneyAmount,
  getPublicMoney,
  localizedMoneyText,
  type PublicMoneyFilters,
  type PublicMoneyLocalizedText,
  type PublicMoneyRecord,
} from "@/lib/public-money";
import { OfficialMoneyClaim } from "./OfficialMoneyClaim";
import styles from "./public-money.module.css";

const copy = {
  en: {
    eyebrow: "PREPARED DIRECTORY",
    title: "Public Money",
    intro:
      "A source-first directory for reviewed financial observations across every stage of public money.",
    prepared: "Prepared directory · No reviewed public-money records",
    preparedText:
      "The routes and filters are ready. No amount, reporting period or stage observation is published until source and bilingual review is complete.",
    ruleAnnouncement: "Announcement is not expenditure.",
    ruleContract: "Contract value is not outcome.",
    chainEyebrow: "FINANCIAL CHAIN",
    chainTitle: "Eleven stages, kept distinct",
    chainNote:
      "Each stage keeps its own meaning, reporting period and source. No demonstration amount is presented as production data.",
    filters: "Filter reviewed public-money records",
    stage: "Stage",
    department: "Department",
    district: "District",
    amount: "Amount information",
    allStages: "All stages",
    allDepartments: "All departments",
    allDistricts: "All districts",
    amountAll: "All records",
    amountPublished: "Amount published",
    amountUnavailable: "Amount unavailable",
    loading: "Loading the reviewed public-money catalogue…",
    emptyTitle: "No reviewed public-money records are published yet",
    emptyText:
      "This is an intentionally empty prepared-data state, not a claim that Andhra Pradesh has no public-money records.",
    noMatchTitle: "No reviewed public-money records match these filters",
    noMatchText: "Change one or more filters to see other reviewed records.",
    errorTitle: "Public-money records could not be loaded",
    errorText:
      "The prepared catalogue is temporarily unavailable. No financial figure is being substituted.",
    retry: "Retry",
    observation: "Observation",
    description: "Description",
    districts: "District coverage",
    reportingPeriod: "Reporting period",
    reportingUnavailable: "Reporting period not stated in source",
    amountLabel: "Amount",
    amountUnavailableText: "Amount not published in this reviewed record",
  },
  te: {
    eyebrow: "ఆంధ్రప్రదేశ్ · సిద్ధం చేసిన డైరెక్టరీ",
    title: "ఆంధ్రప్రదేశ్ ప్రజా ధనం",
    intro:
      "ప్రజా ధనం యొక్క ప్రతి దశలోని సమీక్షించిన ఆర్థిక పరిశీలనల కోసం మూలాధార-కేంద్రీకృత డైరెక్టరీ.",
    prepared: "సిద్ధం చేసిన డైరెక్టరీ · సమీక్షించిన ప్రజా ధన రికార్డులు లేవు",
    preparedText:
      "మార్గాలు, ఫిల్టర్లు సిద్ధంగా ఉన్నాయి. మూలం మరియు ద్విభాషా సమీక్ష పూర్తయ్యే వరకు మొత్తం, రిపోర్టింగ్ వ్యవధి లేదా దశ పరిశీలన ప్రచురించబడదు.",
    ruleAnnouncement: "ప్రకటన ఖర్చు కాదు.",
    ruleContract: "కాంట్రాక్టు విలువ ఫలితం కాదు.",
    chainEyebrow: "ఆర్థిక గొలుసు",
    chainTitle: "పదకొండు దశలు, విడివిడిగా ఉంచబడ్డాయి",
    chainNote:
      "ప్రతి దశ దాని స్వంత అర్థం, రిపోర్టింగ్ వ్యవధి మరియు మూలాన్ని కలిగి ఉంటుంది. ఉత్పత్తి డేటాగా ఎటువంటి ప్రదర్శన మొత్తం చూపబడదు.",
    filters: "సమీక్షించిన ప్రజా ధన రికార్డులను ఫిల్టర్ చేయండి",
    stage: "దశ",
    department: "శాఖ",
    district: "జిల్లా",
    amount: "మొత్తం సమాచారం",
    allStages: "అన్ని దశలు",
    allDepartments: "అన్ని శాఖలు",
    allDistricts: "అన్ని జిల్లాలు",
    amountAll: "అన్ని రికార్డులు",
    amountPublished: "మొత్తం ప్రచురించబడింది",
    amountUnavailable: "మొత్తం అందుబాటులో లేదు",
    loading: "సమీక్షించిన ప్రజా ధన జాబితా లోడ్ అవుతోంది…",
    emptyTitle: "సమీక్షించిన ప్రజా ధన రికార్డులు ఇంకా ప్రచురించబడలేదు",
    emptyText:
      "ఇది ఉద్దేశపూర్వకంగా ఖాళీగా ఉన్న సిద్ధం చేసిన డేటా స్థితి; ఆంధ్రప్రదేశ్‌లో ప్రజా ధన రికార్డులు లేవని చెప్పడం కాదు.",
    noMatchTitle: "ఈ ఫిల్టర్లకు సరిపోలే సమీక్షించిన ప్రజా ధన రికార్డులు లేవు",
    noMatchText: "ఇతర సమీక్షించిన రికార్డుల కోసం ఫిల్టర్లను మార్చండి.",
    errorTitle: "ప్రజా ధన రికార్డులను లోడ్ చేయలేకపోయాము",
    errorText:
      "సిద్ధం చేసిన జాబితా తాత్కాలికంగా అందుబాటులో లేదు. ప్రత్యామ్నాయ ఆర్థిక గణాంకం చూపబడదు.",
    retry: "మళ్లీ ప్రయత్నించండి",
    observation: "పరిశీలన",
    description: "వివరణ",
    districts: "జిల్లా పరిధి",
    reportingPeriod: "రిపోర్టింగ్ వ్యవధి",
    reportingUnavailable: "మూలంలో రిపోర్టింగ్ వ్యవధి పేర్కొనలేదు",
    amountLabel: "మొత్తం",
    amountUnavailableText: "ఈ సమీక్షించిన రికార్డులో మొత్తం ప్రచురించబడలేదు",
  },
} as const;

const initialFilters: PublicMoneyFilters = {
  stage: "",
  department: "",
  district: "",
  amount: "all",
};

function uniqueClaims(
  records: PublicMoneyRecord[],
  select: (record: PublicMoneyRecord) => PublicMoneyLocalizedText[],
): PublicMoneyLocalizedText[] {
  const values = new Map<string, PublicMoneyLocalizedText>();
  records.forEach((record) =>
    select(record).forEach((value) => values.set(value.en, value)),
  );
  return [...values.values()].sort((a, b) => a.en.localeCompare(b.en));
}

function getCopyLabels<T>(copyObj: Record<string, T>, loc: string): T {
  return copyObj[loc] ?? copyObj.en;
}

export function PublicMoneyDirectory() {
  const { locale } = useLocale();
  const { selectedState, selectedStateIso, setSelectedStateIso } =
    useSelectedState();
  const labels = getCopyLabels(copy, locale);
  const apOnly = selectedStateIso === "IN-AP";
  const [records, setRecords] = useState<PublicMoneyRecord[]>([]);
  const [filters, setFilters] = useState<PublicMoneyFilters>(initialFilters);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  async function load(signal?: AbortSignal) {
    setState("loading");
    try {
      const response = await getPublicMoney(signal);
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
  const filtered = filterPublicMoney(records, filters);

  function selectFilter<Key extends keyof PublicMoneyFilters>(
    key: Key,
    value: PublicMoneyFilters[Key],
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
            <strong>{labels.ruleAnnouncement}</strong>
            <strong>{labels.ruleContract}</strong>
          </div>
        </section>

        <section
          className="section shell"
          aria-labelledby="money-stages-heading"
        >
          <div className="section-heading section-heading--split">
            <div>
              <p className="eyebrow">{labels.chainEyebrow}</p>
              <h2 id="money-stages-heading">{labels.chainTitle}</h2>
            </div>
            <p>{labels.chainNote}</p>
          </div>
          <FinancialStageSelector />
        </section>

        <section className="section shell" aria-labelledby="money-results">
          <h2 className="sr-only" id="money-results">
            {labels.title}
          </h2>
          {apOnly ? (
            <>
              <fieldset className={styles.filters}>
                <legend className="sr-only">{labels.filters}</legend>
                <MoneyFilter
                  id="money-stage"
                  label={labels.stage}
                  allLabel={labels.allStages}
                  options={stages}
                  locale={locale}
                  value={filters.stage}
                  onChange={(value) => selectFilter("stage", value)}
                />
                <MoneyFilter
                  id="money-department"
                  label={labels.department}
                  allLabel={labels.allDepartments}
                  options={departments}
                  locale={locale}
                  value={filters.department}
                  onChange={(value) => selectFilter("department", value)}
                />
                <MoneyFilter
                  id="money-district"
                  label={labels.district}
                  allLabel={labels.allDistricts}
                  options={districts}
                  locale={locale}
                  value={filters.district}
                  onChange={(value) => selectFilter("district", value)}
                />
                <div>
                  <label htmlFor="money-amount">{labels.amount}</label>
                  <select
                    id="money-amount"
                    value={filters.amount}
                    onChange={(event) =>
                      selectFilter(
                        "amount",
                        event.currentTarget
                          .value as PublicMoneyFilters["amount"],
                      )
                    }
                  >
                    <option value="all">{labels.amountAll}</option>
                    <option value="published">{labels.amountPublished}</option>
                    <option value="unavailable">
                      {labels.amountUnavailable}
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
                          <OfficialMoneyClaim
                            label={labels.observation}
                            source={record.title.source}
                          >
                            <h2 lang={locale}>
                              <Link href={`/public-money/${record.slug}`}>
                                {localizedMoneyText(record.title.value, locale)}
                              </Link>
                            </h2>
                          </OfficialMoneyClaim>
                          <OfficialMoneyClaim
                            label={labels.description}
                            source={record.description.source}
                          >
                            <p lang={locale}>
                              {localizedMoneyText(
                                record.description.value,
                                locale,
                              )}
                            </p>
                          </OfficialMoneyClaim>
                        </div>
                        <div className={styles.claimGrid}>
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
                            {localizedMoneyText(
                              record.department.value,
                              locale,
                            )}
                          </OfficialMoneyClaim>
                          <OfficialMoneyClaim
                            label={labels.districts}
                            source={record.districts.source}
                          >
                            {record.districts.value
                              .map((district) =>
                                localizedMoneyText(district, locale),
                              )
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
                                {labels.amountUnavailableText}
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
            <ApOnlyCatalogNotice
              jurisdiction={selectedState.name_en}
              onViewAp={() => setSelectedStateIso("IN-AP")}
            />
          )}
        </section>
      </main>
      <PageFooter />
    </>
  );
}

function MoneyFilter({
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
  options: PublicMoneyLocalizedText[];
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
            {localizedMoneyText(option, locale)}
          </option>
        ))}
      </select>
    </div>
  );
}
