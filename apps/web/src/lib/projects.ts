import type { Locale } from "./catalog-types";

export interface ProjectLocalizedText {
  en: string;
  te: string;
}

export interface ProjectSourceRecord {
  source_record_id: string;
  source_name: string;
  official_source_url: string;
  public_source_url?: string | null;
  retrieval_date: string;
  review_status: "reviewed";
}

export interface OfficialProjectClaim<T> {
  classification: "official";
  value: T;
  source: ProjectSourceRecord;
}

export interface ProjectTimeline {
  start_date: string | null;
  expected_completion_date: string | null;
  actual_completion_date: string | null;
}

export interface ProjectRecord {
  slug: string;
  name: OfficialProjectClaim<ProjectLocalizedText>;
  description: OfficialProjectClaim<ProjectLocalizedText>;
  department: OfficialProjectClaim<ProjectLocalizedText>;
  districts: OfficialProjectClaim<ProjectLocalizedText[]>;
  status: OfficialProjectClaim<ProjectLocalizedText>;
  project_type: OfficialProjectClaim<ProjectLocalizedText>;
  responsible_office: OfficialProjectClaim<ProjectLocalizedText>;
  timeline: OfficialProjectClaim<ProjectTimeline>;
}

export interface ProjectFilters {
  department: string;
  district: string;
  status: string;
  projectType: string;
}

export interface ProjectCatalogResponse {
  data: ProjectRecord[];
  status: "prepared-empty" | "reviewed";
}

// Production remains empty until every project claim completes source and bilingual review.
export const preparedProjects: readonly ProjectRecord[] = [];

export function localizedProjectText(
  value: ProjectLocalizedText,
  locale: Locale,
): string {
  return locale === "te" ? value.te : value.en;
}

export function filterProjects(
  projects: ProjectRecord[],
  filters: ProjectFilters,
): ProjectRecord[] {
  return projects.filter(
    (project) =>
      (!filters.department ||
        project.department.value.en === filters.department) &&
      (!filters.district ||
        project.districts.value.some(
          (district) => district.en === filters.district,
        )) &&
      (!filters.status || project.status.value.en === filters.status) &&
      (!filters.projectType ||
        project.project_type.value.en === filters.projectType),
  );
}

export function preparedProjectBySlug(slug: string): ProjectRecord | null {
  return preparedProjects.find((project) => project.slug === slug) ?? null;
}

export async function getProjects(
  signal?: AbortSignal,
): Promise<ProjectCatalogResponse> {
  const response = await fetch("/api/projects", {
    headers: { Accept: "application/json" },
    signal,
  });
  if (!response.ok) {
    throw new Error(`Project request failed with status ${response.status}`);
  }
  return (await response.json()) as ProjectCatalogResponse;
}
