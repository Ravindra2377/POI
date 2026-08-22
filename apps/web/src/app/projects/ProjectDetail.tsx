"use client";

import Link from "next/link";
import { useLocale } from "@/components/LocaleProvider";
import { getCopyLabels } from "@/lib/copy-helper";
import { PageFooter } from "@/components/PageFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { RecordWatchControl } from "@/components/RecordWatchControl";
import { localizedProjectText, type ProjectRecord } from "@/lib/projects";
import { OfficialProjectClaim } from "./OfficialProjectClaim";
import { ProjectTimeline } from "./ProjectTimeline";
import styles from "./projects.module.css";

const copy = {
  en: {
    back: "← All AP projects",
    eyebrow: "ANDHRA PRADESH · PROJECT RECORD",
    unavailable: "Project record unavailable",
    unavailableText:
      "No reviewed, source-backed project record is published at this address. The address alone does not establish that a project exists or does not exist.",
    prepared: "Prepared-data status",
    overview: "Official overview",
    details: "Official responsibility and timeline",
    name: "Project name",
    description: "Description",
    department: "Department",
    districts: "District coverage",
    status: "Status",
    projectType: "Project type",
    responsibleOffice: "Responsible office",
    timeline: "Timeline",
    start: "Start",
    expected: "Expected completion",
    actual: "Actual completion",
    notStated: "Not stated in source",
  },
  te: {
    back: "← అన్ని ఆంధ్రప్రదేశ్ ప్రాజెక్టులు",
    eyebrow: "ఆంధ్రప్రదేశ్ · ప్రాజెక్టు రికార్డు",
    unavailable: "ప్రాజెక్టు రికార్డు అందుబాటులో లేదు",
    unavailableText:
      "ఈ చిరునామాలో సమీక్షించిన, మూలాధారంతో కూడిన ప్రాజెక్టు రికార్డు ప్రచురించబడలేదు. ఈ చిరునామా మాత్రమే ప్రాజెక్టు ఉందని లేదా లేదని నిర్ధారించదు.",
    prepared: "సిద్ధం చేసిన డేటా స్థితి",
    overview: "అధికారిక అవలోకనం",
    details: "అధికారిక బాధ్యత మరియు కాలక్రమం",
    name: "ప్రాజెక్టు పేరు",
    description: "వివరణ",
    department: "శాఖ",
    districts: "జిల్లా పరిధి",
    status: "స్థితి",
    projectType: "ప్రాజెక్టు రకం",
    responsibleOffice: "బాధ్యత గల కార్యాలయం",
    timeline: "కాలక్రమం",
    start: "ప్రారంభం",
    expected: "అంచనా పూర్తి",
    actual: "వాస్తవ పూర్తి",
    notStated: "మూలంలో పేర్కొనలేదు",
  },
} as const;

export function ProjectDetail({
  project,
  requestedSlug,
}: {
  project: ProjectRecord | null;
  requestedSlug: string;
}) {
  const { locale } = useLocale();
  const labels = getCopyLabels(copy, locale);

  return (
    <>
      <SiteHeader />
      <main id="main-content">
        <header className={`page-intro shell ${styles.detailHeader}`}>
          <Link className={styles.backLink} href="/projects">
            {labels.back}
          </Link>
          <p className="eyebrow">{labels.eyebrow}</p>
          {project ? (
            <OfficialProjectClaim
              label={labels.name}
              source={project.name.source}
            >
              <h1 lang={locale}>
                {localizedProjectText(project.name.value, locale)}
              </h1>
            </OfficialProjectClaim>
          ) : (
            <>
              <h1>{labels.unavailable}</h1>
              <p className="lede">{labels.unavailableText}</p>
              <p className={styles.unavailableSlug}>
                {labels.prepared}: {requestedSlug}
              </p>
            </>
          )}
          {project && (
            <RecordWatchControl
              record={{
                id: "project:" + project.slug,
                kind: "project",
                title: localizedProjectText(project.name.value, locale),
                href: "/projects/" + project.slug,
              }}
            />
          )}
        </header>
        {project && (
          <section className="section shell">
            <div className={styles.detailGrid}>
              <div>
                <h2>{labels.overview}</h2>
                <OfficialProjectClaim
                  label={labels.description}
                  source={project.description.source}
                >
                  <p lang={locale}>
                    {localizedProjectText(project.description.value, locale)}
                  </p>
                </OfficialProjectClaim>
              </div>
              <div>
                <h2>{labels.details}</h2>
                <div className={styles.detailClaims}>
                  <OfficialProjectClaim
                    label={labels.department}
                    source={project.department.source}
                  >
                    {localizedProjectText(project.department.value, locale)}
                  </OfficialProjectClaim>
                  <OfficialProjectClaim
                    label={labels.districts}
                    source={project.districts.source}
                  >
                    {project.districts.value
                      .map((district) => localizedProjectText(district, locale))
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
                    {localizedProjectText(project.project_type.value, locale)}
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
              </div>
            </div>
          </section>
        )}
      </main>
      <PageFooter />
    </>
  );
}
