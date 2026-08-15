"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageFooter } from "@/components/PageFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { useLocale } from "@/components/LocaleProvider";
import {
  filterSchemes,
  getSchemes,
  localized,
  type LocalizedText,
  type SchemeFilters,
  type SchemeRecord,
} from "@/lib/schemes";
import { OfficialClaim } from "./OfficialClaim";
import styles from "./schemes.module.css";

const copy = {
  en: {
    eyebrow: "ANDHRA PRADESH · REVIEWED DIRECTORY",
    title: "AP Schemes",
    intro:
      "A source-first directory for reviewed government scheme names, descriptions and eligibility rules.",
    prepared: "Prepared directory · No reviewed scheme records",
    preparedText:
      "The routes and filters are ready, but no scheme names, descriptions or eligibility rules are published until source and bilingual review is complete.",
    teluguNotice:
      "Telugu labels are not yet reviewed for these records; English values are shown.",
    filters: "Filter reviewed schemes",
    department: "Department",
    district: "District",
    category: "Category",
    eligibility: "Eligibility information",
    allDepartments: "All departments",
    allDistricts: "All districts",
    allCategories: "All categories",
    allEligibility: "All records",
    eligibilityPublished: "Criteria published",
    eligibilityUnavailable: "Criteria unavailable",
    loading: "Loading the reviewed scheme catalogue…",
    emptyTitle: "No reviewed scheme records are published yet",
    emptyText:
      "This is an intentionally empty prepared-data state, not a claim that Andhra Pradesh has no schemes.",
    noMatchTitle: "No reviewed schemes match these filters",
    noMatchText: "Change one or more filters to see other reviewed records.",
    errorTitle: "Scheme records could not be loaded",
    errorText:
      "The prepared catalogue is temporarily unavailable. No scheme information is being substituted.",
    retry: "Retry",
    name: "Scheme name",
    description: "Description",
    departments: "Department coverage",
    districts: "District coverage",
    categoryLabel: "Category",
    criteria: "Eligibility criteria",
    criteriaUnavailable: "Not published in this reviewed record",
  },
  te: {
    eyebrow: "ఆంధ్రప్రదేశ్ · సమీక్షించిన డైరెక్టరీ",
    title: "ఆంధ్రప్రదేశ్ పథకాలు",
    intro:
      "సమీక్షించిన ప్రభుత్వ పథకాల పేర్లు, వివరణలు, అర్హత నియమాల కోసం మూలాధార-కేంద్రీకృత డైరెక్టరీ.",
    prepared: "సిద్ధం చేసిన డైరెక్టరీ · సమీక్షించిన పథక రికార్డులు లేవు",
    preparedText:
      "మార్గాలు, ఫిల్టర్లు సిద్ధంగా ఉన్నాయి. మూలం మరియు ద్విభాషా సమీక్ష పూర్తయ్యే వరకు పథకాల పేర్లు, వివరణలు లేదా అర్హత నియమాలు ప్రచురించబడవు.",
    teluguNotice:
      "ఈ రికార్డులకు తెలుగు లేబుళ్లు ఇంకా సమీక్షించబడలేదు; ఇంగ్లీషు విలువలు చూపబడతాయి.",
    filters: "సమీక్షించిన పథకాలను ఫిల్టర్ చేయండి",
    department: "శాఖ",
    district: "జిల్లా",
    category: "వర్గం",
    eligibility: "అర్హత సమాచారం",
    allDepartments: "అన్ని శాఖలు",
    allDistricts: "అన్ని జిల్లాలు",
    allCategories: "అన్ని వర్గాలు",
    allEligibility: "అన్ని రికార్డులు",
    eligibilityPublished: "ప్రమాణాలు ప్రచురించబడ్డాయి",
    eligibilityUnavailable: "ప్రమాణాలు అందుబాటులో లేవు",
    loading: "సమీక్షించిన పథకాల జాబితా లోడ్ అవుతోంది…",
    emptyTitle: "సమీక్షించిన పథక రికార్డులు ఇంకా ప్రచురించబడలేదు",
    emptyText:
      "ఇది ఉద్దేశపూర్వకంగా ఖాళీగా ఉన్న సిద్ధం చేసిన డేటా స్థితి; ఆంధ్రప్రదేశ్‌లో పథకాలు లేవని చెప్పడం కాదు.",
    noMatchTitle: "ఈ ఫిల్టర్లకు సరిపోలే సమీక్షించిన పథకాలు లేవు",
    noMatchText: "ఇతర సమీక్షించిన రికార్డుల కోసం ఫిల్టర్లను మార్చండి.",
    errorTitle: "పథక రికార్డులను లోడ్ చేయలేకపోయాము",
    errorText:
      "సిద్ధం చేసిన జాబితా తాత్కాలికంగా అందుబాటులో లేదు. ప్రత్యామ్నాయ పథక సమాచారం చూపబడదు.",
    retry: "మళ్లీ ప్రయత్నించండి",
    name: "పథకం పేరు",
    description: "వివరణ",
    departments: "శాఖ పరిధి",
    districts: "జిల్లా పరిధి",
    categoryLabel: "వర్గం",
    criteria: "అర్హత ప్రమాణాలు",
    criteriaUnavailable: "ఈ సమీక్షించిన రికార్డులో ప్రచురించబడలేదు",
  },
} as const;

const initialFilters: SchemeFilters = {
  department: "",
  district: "",
  category: "",
  eligibility: "all",
};

function uniqueClaims(
  records: SchemeRecord[],
  select: (record: SchemeRecord) => LocalizedText[] | null,
): LocalizedText[] {
  const values = new Map<string, LocalizedText>();
  records.forEach((record) => {
    const selected = select(record);
    if (selected === null) return;
    selected.forEach((value) => values.set(value.en, value));
  });
  return [...values.values()].sort((a, b) => a.en.localeCompare(b.en));
}

export function SchemesDirectory() {
  const { locale } = useLocale();
  const labels = copy[locale];
  const [records, setRecords] = useState<SchemeRecord[]>([]);
  const [teluguReviewed, setTeluguReviewed] = useState(false);
  const [filters, setFilters] = useState<SchemeFilters>(initialFilters);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  async function load(signal?: AbortSignal) {
    setState("loading");
    try {
      const response = await getSchemes(signal);
      setRecords(response.data);
      setTeluguReviewed(response.telugu_reviewed);
      setState("ready");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setRecords([]);
      setTeluguReviewed(false);
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

  const departments = uniqueClaims(records, (record) =>
    record.department === null ? null : [record.department.value],
  );
  const districts = uniqueClaims(
    records,
    (record) => record.districts?.value ?? null,
  );
  const categories = uniqueClaims(records, (record) => [record.category.value]);
  const filtered = filterSchemes(records, filters);

  function selectFilter<Key extends keyof SchemeFilters>(
    key: Key,
    value: SchemeFilters[Key],
  ) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  const showPrepared = state === "ready" && records.length === 0;

  return (
    <>
      <SiteHeader />
      <main id="main-content">
        <header className="page-intro shell">
          <p className="eyebrow">{labels.eyebrow}</p>
          <h1>{labels.title}</h1>
          <p className="lede">{labels.intro}</p>
          {showPrepared ? (
            <aside className={styles.notice} aria-label={labels.prepared}>
              <strong>{labels.prepared}</strong>
              <p>{labels.preparedText}</p>
            </aside>
          ) : (
            !teluguReviewed && (
              <aside className={styles.notice} aria-label={labels.teluguNotice}>
                <strong>{labels.teluguNotice}</strong>
              </aside>
            )
          )}
        </header>

        <section className="section shell" aria-labelledby="scheme-results">
          <h2 className="sr-only" id="scheme-results">
            {labels.title}
          </h2>
          <fieldset className={styles.filters}>
            <legend className="sr-only">{labels.filters}</legend>
            <div>
              <label htmlFor="scheme-department">{labels.department}</label>
              <select
                id="scheme-department"
                value={filters.department}
                onChange={(event) =>
                  selectFilter("department", event.currentTarget.value)
                }
              >
                <option value="">{labels.allDepartments}</option>
                {departments.map((item) => (
                  <option key={item.en} value={item.en}>
                    {localized(item, locale)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="scheme-district">{labels.district}</label>
              <select
                id="scheme-district"
                value={filters.district}
                onChange={(event) =>
                  selectFilter("district", event.currentTarget.value)
                }
              >
                <option value="">{labels.allDistricts}</option>
                {districts.map((item) => (
                  <option key={item.en} value={item.en}>
                    {localized(item, locale)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="scheme-category">{labels.category}</label>
              <select
                id="scheme-category"
                value={filters.category}
                onChange={(event) =>
                  selectFilter("category", event.currentTarget.value)
                }
              >
                <option value="">{labels.allCategories}</option>
                {categories.map((item) => (
                  <option key={item.en} value={item.en}>
                    {localized(item, locale)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="scheme-eligibility">{labels.eligibility}</label>
              <select
                id="scheme-eligibility"
                value={filters.eligibility}
                onChange={(event) =>
                  selectFilter(
                    "eligibility",
                    event.currentTarget.value as SchemeFilters["eligibility"],
                  )
                }
              >
                <option value="all">{labels.allEligibility}</option>
                <option value="published">{labels.eligibilityPublished}</option>
                <option value="unavailable">
                  {labels.eligibilityUnavailable}
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
                {filtered.map((scheme) => (
                  <li key={scheme.slug}>
                    <div>
                      <OfficialClaim
                        label={labels.name}
                        source={scheme.name.source}
                      >
                        <h2 lang={locale}>
                          <Link href={`/schemes/${scheme.slug}`}>
                            {localized(scheme.name.value, locale)}
                          </Link>
                        </h2>
                      </OfficialClaim>
                      <OfficialClaim
                        label={labels.description}
                        source={scheme.description.source}
                      >
                        <p lang={locale}>
                          {localized(scheme.description.value, locale)}
                        </p>
                      </OfficialClaim>
                    </div>
                    <div className={styles.claimGrid}>
                      {scheme.department !== null ? (
                        <OfficialClaim
                          label={labels.departments}
                          source={scheme.department.source}
                        >
                          {localized(scheme.department.value, locale)}
                        </OfficialClaim>
                      ) : (
                        <div className={styles.claim}>
                          <span className={styles.claimLabel}>
                            {labels.departments}
                          </span>
                          <div className={styles.claimValue}>
                            {labels.criteriaUnavailable}
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
                            {labels.criteriaUnavailable}
                          </div>
                        </div>
                      )}
                      <OfficialClaim
                        label={labels.categoryLabel}
                        source={scheme.category.source}
                      >
                        {localized(scheme.category.value, locale)}
                      </OfficialClaim>
                      {scheme.eligibility ? (
                        <OfficialClaim
                          label={labels.criteria}
                          source={scheme.eligibility.source}
                        >
                          {scheme.eligibility.value
                            .map((criterion) => localized(criterion, locale))
                            .join("; ")}
                        </OfficialClaim>
                      ) : (
                        <div className={styles.claim}>
                          <span className={styles.claimLabel}>
                            {labels.criteria}
                          </span>
                          <div className={styles.claimValue}>
                            {labels.criteriaUnavailable}
                          </div>
                        </div>
                      )}
                    </div>
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
