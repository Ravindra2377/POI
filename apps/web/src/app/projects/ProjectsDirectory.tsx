"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Locale } from "@/lib/catalog-types";
import { useLocale } from "@/components/LocaleProvider";
import { useSelectedState } from "@/components/StateProvider";
import { getCopyLabels } from "@/lib/copy-helper";
import { ApOnlyCatalogNotice } from "@/components/ApOnlyCatalogNotice";
import { PageFooter } from "@/components/PageFooter";
import { SiteHeader } from "@/components/SiteHeader";
import {
  filterProjects,
  getProjects,
  localizedProjectText,
  type ProjectFilters,
  type ProjectLocalizedText,
  type ProjectRecord,
} from "@/lib/projects";
import { OfficialProjectClaim } from "./OfficialProjectClaim";
import { ProjectTimeline } from "./ProjectTimeline";
import styles from "./projects.module.css";

const copy = {
  en: {
    eyebrow: "PREPARED DIRECTORY",
    title: "Projects",
    intro:
      "A source-first directory for reviewed public project descriptions, responsibility, status and timelines.",
    prepared: "Prepared directory · No reviewed project records",
    preparedText:
      "The routes and filters are ready. No project, office, status or date is published until source and bilingual review is complete.",
    filters: "Filter reviewed projects",
    department: "Department",
    district: "District",
    status: "Status",
    projectType: "Project type",
    allDepartments: "All departments",
    allDistricts: "All districts",
    allStatuses: "All statuses",
    allTypes: "All project types",
    loading: "Loading the reviewed project catalogue…",
    emptyTitle: "No reviewed project records are published yet",
    emptyText:
      "This is an intentionally empty prepared-data state, not a claim that Andhra Pradesh has no public projects.",
    noMatchTitle: "No reviewed projects match these filters",
    noMatchText: "Change one or more filters to see other reviewed records.",
    errorTitle: "Project records could not be loaded",
    errorText:
      "The prepared catalogue is temporarily unavailable. No project information is being substituted.",
    retry: "Retry",
    name: "Project name",
    description: "Description",
    districts: "District coverage",
    responsibleOffice: "Responsible office",
    timeline: "Timeline",
    start: "Start",
    expected: "Expected completion",
    actual: "Actual completion",
    notStated: "Not stated in source",
  },
  te: {
    eyebrow: "ఆంధ్రప్రదేశ్ · సిద్ధం చేసిన డైరెక్టరీ",
    title: "ఆంధ్రప్రదేశ్ ప్రాజెక్టులు",
    intro:
      "సమీక్షించిన ప్రజా ప్రాజెక్టుల వివరణలు, బాధ్యత, స్థితి మరియు కాలక్రమం కోసం మూలాధార-కేంద్రీకృత డైరెక్టరీ.",
    prepared: "సిద్ధం చేసిన డైరెక్టరీ · సమీక్షించిన ప్రాజెక్టు రికార్డులు లేవు",
    preparedText:
      "మార్గాలు, ఫిల్టర్లు సిద్ధంగా ఉన్నాయి. మూలం మరియు ద్విభాషా సమీక్ష పూర్తయ్యే వరకు ప్రాజెక్టు, కార్యాలయం, స్థితి లేదా తేదీ ప్రచురించబడదు.",
    filters: "సమీక్షించిన ప్రాజెక్టులను ఫిల్టర్ చేయండి",
    department: "శాఖ",
    district: "జిల్లా",
    status: "స్థితి",
    projectType: "ప్రాజెక్టు రకం",
    allDepartments: "అన్ని శాఖలు",
    allDistricts: "అన్ని జిల్లాలు",
    allStatuses: "అన్ని స్థితులు",
    allTypes: "అన్ని ప్రాజెక్టు రకాలు",
    loading: "సమీక్షించిన ప్రాజెక్టుల జాబితా లోడ్ అవుతోంది…",
    emptyTitle: "సమీక్షించిన ప్రాజెక్టు రికార్డులు ఇంకా ప్రచురించబడలేదు",
    emptyText:
      "ఇది ఉద్దేశపూర్వకంగా ఖాళీగా ఉన్న సిద్ధం చేసిన డేటా స్థితి; ఆంధ్రప్రదేశ్‌లో ప్రజా ప్రాజెక్టులు లేవని చెప్పడం కాదు.",
    noMatchTitle: "ఈ ఫిల్టర్లకు సరిపోలే సమీక్షించిన ప్రాజెక్టులు లేవు",
    noMatchText: "ఇతర సమీక్షించిన రికార్డుల కోసం ఫిల్టర్లను మార్చండి.",
    errorTitle: "ప్రాజెక్టు రికార్డులను లోడ్ చేయలేకపోయాము",
    errorText:
      "సిద్ధం చేసిన జాబితా తాత్కాలికంగా అందుబాటులో లేదు. ప్రత్యామ్నాయ ప్రాజెక్టు సమాచారం చూపబడదు.",
    retry: "మళ్లీ ప్రయత్నించండి",
    name: "ప్రాజెక్టు పేరు",
    description: "వివరణ",
    districts: "జిల్లా పరిధి",
    responsibleOffice: "బాధ్యత గల కార్యాలయం",
    timeline: "కాలక్రమం",
    start: "ప్రారంభం",
    expected: "అంచనా పూర్తి",
    actual: "వాస్తవ పూర్తి",
    notStated: "మూలంలో పేర్కొనలేదు",
  },
} as const;

const initialFilters: ProjectFilters = {
  department: "",
  district: "",
  status: "",
  projectType: "",
};

function uniqueClaims(
  records: ProjectRecord[],
  select: (record: ProjectRecord) => ProjectLocalizedText[],
): ProjectLocalizedText[] {
  const values = new Map<string, ProjectLocalizedText>();
  records.forEach((record) =>
    select(record).forEach((value) => values.set(value.en, value)),
  );
  return [...values.values()].sort((a, b) => a.en.localeCompare(b.en));
}

export function ProjectsDirectory() {
  const { locale } = useLocale();
  const { selectedState, selectedStateIso, setSelectedStateIso } =
    useSelectedState();
  const labels = getCopyLabels(copy, locale);
  const apOnly = selectedStateIso === "IN-AP";
  const [records, setRecords] = useState<ProjectRecord[]>([]);
  const [filters, setFilters] = useState<ProjectFilters>(initialFilters);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  async function load(signal?: AbortSignal) {
    setState("loading");
    try {
      const response = await getProjects(signal);
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

  const departments = uniqueClaims(records, (record) => [
    record.department.value,
  ]);
  const districts = uniqueClaims(records, (record) => record.districts.value);
  const statuses = uniqueClaims(records, (record) => [record.status.value]);
  const projectTypes = uniqueClaims(records, (record) => [
    record.project_type.value,
  ]);
  const filtered = filterProjects(records, filters);

  function selectFilter<Key extends keyof ProjectFilters>(
    key: Key,
    value: ProjectFilters[Key],
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
        <section className="section shell" aria-labelledby="project-results">
          <h2 className="sr-only" id="project-results">
            {labels.title}
          </h2>
          {apOnly ? (
            <>
              <fieldset className={styles.filters}>
                <legend className="sr-only">{labels.filters}</legend>
                <ProjectFilter
                  id="project-department"
                  label={labels.department}
                  allLabel={labels.allDepartments}
                  options={departments}
                  locale={locale}
                  value={filters.department}
                  onChange={(value) => selectFilter("department", value)}
                />
                <ProjectFilter
                  id="project-district"
                  label={labels.district}
                  allLabel={labels.allDistricts}
                  options={districts}
                  locale={locale}
                  value={filters.district}
                  onChange={(value) => selectFilter("district", value)}
                />
                <ProjectFilter
                  id="project-status"
                  label={labels.status}
                  allLabel={labels.allStatuses}
                  options={statuses}
                  locale={locale}
                  value={filters.status}
                  onChange={(value) => selectFilter("status", value)}
                />
                <ProjectFilter
                  id="project-type"
                  label={labels.projectType}
                  allLabel={labels.allTypes}
                  options={projectTypes}
                  locale={locale}
                  value={filters.projectType}
                  onChange={(value) => selectFilter("projectType", value)}
                />
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
                    {filtered.map((project) => (
                      <li key={project.slug}>
                        <div>
                          <OfficialProjectClaim
                            label={labels.name}
                            source={project.name.source}
                          >
                            <h2 lang={locale}>
                              <Link href={`/projects/${project.slug}`}>
                                {localizedProjectText(
                                  project.name.value,
                                  locale,
                                )}
                              </Link>
                            </h2>
                          </OfficialProjectClaim>
                          <OfficialProjectClaim
                            label={labels.description}
                            source={project.description.source}
                          >
                            <p lang={locale}>
                              {localizedProjectText(
                                project.description.value,
                                locale,
                              )}
                            </p>
                          </OfficialProjectClaim>
                        </div>
                        <div className={styles.claimGrid}>
                          <OfficialProjectClaim
                            label={labels.department}
                            source={project.department.source}
                          >
                            {localizedProjectText(
                              project.department.value,
                              locale,
                            )}
                          </OfficialProjectClaim>
                          <OfficialProjectClaim
                            label={labels.districts}
                            source={project.districts.source}
                          >
                            {project.districts.value
                              .map((district) =>
                                localizedProjectText(district, locale),
                              )
                              .join(", ")}
                          </OfficialProjectClaim>
                          <OfficialProjectClaim
                            label={labels.status}
                            source={project.status.source}
                          >
                            {localizedProjectText(project.status.value, locale)}
                          </OfficialProjectClaim>
                          <OfficialProjectClaim
                            label={labels.projectType}
                            source={project.project_type.source}
                          >
                            {localizedProjectText(
                              project.project_type.value,
                              locale,
                            )}
                          </OfficialProjectClaim>
                          <OfficialProjectClaim
                            label={labels.responsibleOffice}
                            source={project.responsible_office.source}
                          >
                            {localizedProjectText(
                              project.responsible_office.value,
                              locale,
                            )}
                          </OfficialProjectClaim>
                          <OfficialProjectClaim
                            label={labels.timeline}
                            source={project.timeline.source}
                          >
                            <ProjectTimeline
                              timeline={project.timeline.value}
                              labels={labels}
                            />
                          </OfficialProjectClaim>
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

function ProjectFilter({
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
  options: ProjectLocalizedText[];
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
            {localizedProjectText(option, locale)}
          </option>
        ))}
      </select>
    </div>
  );
}
