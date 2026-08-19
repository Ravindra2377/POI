"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Locale } from "@/lib/catalog-types";
import { useLocale } from "@/components/LocaleProvider";
import { useSelectedState } from "@/components/StateProvider";
import { ApOnlyCatalogNotice } from "@/components/ApOnlyCatalogNotice";
import { PageFooter } from "@/components/PageFooter";
import { SiteHeader } from "@/components/SiteHeader";
import {
  filterOfficeholders,
  getOfficeholders,
  localizedOfficeholderText,
  type OfficeholderFilters,
  type OfficeholderLocalizedText,
  type OfficeholderRecord,
} from "@/lib/officeholders";
import { OfficialOfficeholderClaim } from "./OfficialOfficeholderClaim";
import styles from "./officeholders.module.css";

const copy = {
  en: {
    eyebrow: "PREPARED DIRECTORY",
    title: "Officeholders",
    intro:
      "A source-first directory for reviewed, time-bounded roles and terms.",
    prepared: "Prepared directory · No reviewed officeholder records",
    preparedText:
      "The routes and filters are ready. No officeholder, role or term is published until source and bilingual review is complete.",
    ruleRole: "An office is not the person.",
    ruleEnd: "A term end is not a verdict.",
    chainEyebrow: "ROLES AND TERMS",
    chainTitle: "Terms stay bounded by their sources",
    chainNote:
      "A record asserts the dates and role stated in its source. Nothing is extrapolated beyond them.",
    noteAppointment: "Appointment",
    noteAppointmentText:
      "A person was reported in a role from a date in the source.",
    noteTermEnd: "Term end",
    noteTermEndText:
      "The last dated state in the source; not a reason, resignation or evaluation.",
    noteVerdict: "No verdict",
    noteVerdictText: "Terms are records of fact, not judgements.",
    filters: "Filter reviewed officeholder records",
    office: "Office",
    body: "Government body",
    district: "District",
    termDates: "Term dates",
    allOffices: "All offices",
    allBodies: "All government bodies",
    allDistricts: "All districts",
    termAll: "All records",
    termPublished: "Term dates published",
    termUnavailable: "Term end not stated",
    loading: "Loading the reviewed officeholder catalogue…",
    emptyTitle: "No reviewed officeholder records are published yet",
    emptyText:
      "This is an intentionally empty prepared-data state, not a claim that Andhra Pradesh has no officeholders.",
    noMatchTitle: "No reviewed officeholder records match these filters",
    noMatchText: "Change one or more filters to see other reviewed records.",
    errorTitle: "Officeholder records could not be loaded",
    errorText:
      "The prepared catalogue is temporarily unavailable. No term detail is being substituted.",
    retry: "Retry",
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
    eyebrow: "ఆంధ్రప్రదేశ్ · సిద్ధం చేసిన డైరెక్టరీ",
    title: "ఆంధ్రప్రదేశ్ అధికారులు",
    intro:
      "సమీక్షించిన, కాలపరిమితి గల పాత్రలు మరియు పదవీ కాలాల కోసం మూలాధార-కేంద్రీకృత డైరెక్టరీ.",
    prepared: "సిద్ధం చేసిన డైరెక్టరీ · సమీక్షించిన అధికారి రికార్డులు లేవు",
    preparedText:
      "మార్గాలు, ఫిల్టర్లు సిద్ధంగా ఉన్నాయి. మూలం మరియు ద్విభాషా సమీక్ష పూర్తయ్యే వరకు అధికారి, పాత్ర లేదా పదవీ కాలం ప్రచురించబడదు.",
    ruleRole: "కార్యాలయం వ్యక్తి కాదు.",
    ruleEnd: "పదవీ కాలం ముగింపు తీర్పు కాదు.",
    chainEyebrow: "పాత్రలు మరియు పదవీ కాలాలు",
    chainTitle: "పదవీ కాలాలు వాటి మూలాల ద్వారా పరిమితం",
    chainNote:
      "రికార్డు తన మూలంలో పేర్కొన్న తేదీలు మరియు పాత్రను నిర్ధారిస్తుంది. వాటికి మించి ఏదీ ఊహించబడదు.",
    noteAppointment: "నియామకం",
    noteAppointmentText:
      "ఒక వ్యక్తి మూలంలోని ఒక తేదీ నుండి పాత్రలో ఉన్నట్లు నివేదించబడింది.",
    noteTermEnd: "పదవీ కాల ముగింపు",
    noteTermEndText:
      "మూలంలో పేర్కొన్న చివరి తేదీ స్థితి; కారణం, రాజీనామా లేదా మూల్యాంకనం కాదు.",
    noteVerdict: "తీర్పు లేదు",
    noteVerdictText: "పదవీ కాలాలు వాస్తవ రికార్డులు, తీర్పులు కావు.",
    filters: "సమీక్షించిన అధికారి రికార్డులను ఫిల్టర్ చేయండి",
    office: "కార్యాలయం",
    body: "ప్రభుత్వ సంస్థ",
    district: "జిల్లా",
    termDates: "పదవీ కాల తేదీలు",
    allOffices: "అన్ని కార్యాలయాలు",
    allBodies: "అన్ని ప్రభుత్వ సంస్థలు",
    allDistricts: "అన్ని జిల్లాలు",
    termAll: "అన్ని రికార్డులు",
    termPublished: "పదవీ కాల తేదీలు ప్రచురించబడ్డాయి",
    termUnavailable: "పదవీ కాల ముగింపు పేర్కొనబడలేదు",
    loading: "సమీక్షించిన అధికారి జాబితా లోడ్ అవుతోంది…",
    emptyTitle: "సమీక్షించిన అధికారి రికార్డులు ఇంకా ప్రచురించబడలేదు",
    emptyText:
      "ఇది ఉద్దేశపూర్వకంగా ఖాళీగా ఉన్న సిద్ధం చేసిన డేటా స్థితి; ఆంధ్రప్రదేశ్‌లో అధికారులు లేరని చెప్పడం కాదు.",
    noMatchTitle: "ఈ ఫిల్టర్లకు సరిపోలే సమీక్షించిన అధికారి రికార్డులు లేవు",
    noMatchText: "ఇతర సమీక్షించిన రికార్డుల కోసం ఫిల్టర్లను మార్చండి.",
    errorTitle: "అధికారి రికార్డులను లోడ్ చేయలేకపోయాము",
    errorText:
      "సిద్ధం చేసిన జాబితా తాత్కాలికంగా అందుబాటులో లేదు. ప్రత్యామ్నాయ పదవీ కాల వివరం చూపబడదు.",
    retry: "మళ్లీ ప్రయత్నించండి",
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

const initialFilters: OfficeholderFilters = {
  office: "",
  body: "",
  district: "",
  termDates: "all",
};

function uniqueClaims(
  records: OfficeholderRecord[],
  select: (record: OfficeholderRecord) => OfficeholderLocalizedText[],
): OfficeholderLocalizedText[] {
  const values = new Map<string, OfficeholderLocalizedText>();
  records.forEach((record) =>
    select(record).forEach((value) => values.set(value.en, value)),
  );
  return [...values.values()].sort((a, b) => a.en.localeCompare(b.en));
}

function getCopyLabels<T>(copyObj: Record<string, T>, loc: string): T {
  return copyObj[loc] ?? copyObj.en;
}

export function OfficeholdersDirectory() {
  const { locale } = useLocale();
  const { selectedState, selectedStateIso, setSelectedStateIso } =
    useSelectedState();
  const labels = getCopyLabels(copy, locale);
  const apOnly = selectedStateIso === "IN-AP";
  const [records, setRecords] = useState<OfficeholderRecord[]>([]);
  const [filters, setFilters] = useState<OfficeholderFilters>(initialFilters);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  async function load(signal?: AbortSignal) {
    setState("loading");
    try {
      const response = await getOfficeholders(signal);
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

  const offices = uniqueClaims(records, (record) => [record.office.value]);
  const bodies = uniqueClaims(records, (record) => [record.body.value]);
  const districts = uniqueClaims(records, (record) => record.districts.value);
  const filtered = filterOfficeholders(records, filters);

  function selectFilter<Key extends keyof OfficeholderFilters>(
    key: Key,
    value: OfficeholderFilters[Key],
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
            <strong>{labels.ruleRole}</strong>
            <strong>{labels.ruleEnd}</strong>
          </div>
        </section>

        <section
          className="section shell"
          aria-labelledby="officeholder-terms-heading"
        >
          <div className="section-heading section-heading--split">
            <div>
              <p className="eyebrow">{labels.chainEyebrow}</p>
              <h2 id="officeholder-terms-heading">{labels.chainTitle}</h2>
            </div>
            <p>{labels.chainNote}</p>
          </div>
          <ul className={styles.termNotes}>
            <li>
              <strong>{labels.noteAppointment}</strong>
              <span>{labels.noteAppointmentText}</span>
            </li>
            <li>
              <strong>{labels.noteTermEnd}</strong>
              <span>{labels.noteTermEndText}</span>
            </li>
            <li>
              <strong>{labels.noteVerdict}</strong>
              <span>{labels.noteVerdictText}</span>
            </li>
          </ul>
        </section>

        <section
          className="section shell"
          aria-labelledby="officeholder-results"
        >
          <h2 className="sr-only" id="officeholder-results">
            {labels.title}
          </h2>
          {apOnly ? (
            <>
              <fieldset className={styles.filters}>
                <legend className="sr-only">{labels.filters}</legend>
                <OfficeholderFilter
                  id="officeholder-office"
                  label={labels.office}
                  allLabel={labels.allOffices}
                  options={offices}
                  locale={locale}
                  value={filters.office}
                  onChange={(value) => selectFilter("office", value)}
                />
                <OfficeholderFilter
                  id="officeholder-body"
                  label={labels.body}
                  allLabel={labels.allBodies}
                  options={bodies}
                  locale={locale}
                  value={filters.body}
                  onChange={(value) => selectFilter("body", value)}
                />
                <OfficeholderFilter
                  id="officeholder-district"
                  label={labels.district}
                  allLabel={labels.allDistricts}
                  options={districts}
                  locale={locale}
                  value={filters.district}
                  onChange={(value) => selectFilter("district", value)}
                />
                <div>
                  <label htmlFor="officeholder-term-dates">
                    {labels.termDates}
                  </label>
                  <select
                    id="officeholder-term-dates"
                    value={filters.termDates}
                    onChange={(event) =>
                      selectFilter(
                        "termDates",
                        event.currentTarget
                          .value as OfficeholderFilters["termDates"],
                      )
                    }
                  >
                    <option value="all">{labels.termAll}</option>
                    <option value="published">{labels.termPublished}</option>
                    <option value="unavailable">
                      {labels.termUnavailable}
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
                          <OfficialOfficeholderClaim
                            label={labels.observation}
                            source={record.title.source}
                          >
                            <h2 lang={locale}>
                              <Link href={`/officeholders/${record.slug}`}>
                                {localizedOfficeholderText(
                                  record.title.value,
                                  locale,
                                )}
                              </Link>
                            </h2>
                          </OfficialOfficeholderClaim>
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
                        <div className={styles.claimGrid}>
                          <OfficialOfficeholderClaim
                            label={labels.holder}
                            source={record.holder.source}
                          >
                            {localizedOfficeholderText(
                              record.holder.value,
                              locale,
                            )}
                          </OfficialOfficeholderClaim>
                          <OfficialOfficeholderClaim
                            label={labels.officeLabel}
                            source={record.office.source}
                          >
                            {localizedOfficeholderText(
                              record.office.value,
                              locale,
                            )}
                          </OfficialOfficeholderClaim>
                          <OfficialOfficeholderClaim
                            label={labels.bodyLabel}
                            source={record.body.source}
                          >
                            {localizedOfficeholderText(
                              record.body.value,
                              locale,
                            )}
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

function OfficeholderFilter({
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
  options: OfficeholderLocalizedText[];
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
            {localizedOfficeholderText(option, locale)}
          </option>
        ))}
      </select>
    </div>
  );
}
