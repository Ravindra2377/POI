import type { ProjectTimeline as ProjectTimelineValue } from "@/lib/projects";
import styles from "./projects.module.css";

export function ProjectTimeline({
  timeline,
  labels,
}: {
  timeline: ProjectTimelineValue;
  labels: {
    start: string;
    expected: string;
    actual: string;
    notStated: string;
  };
}) {
  return (
    <dl className={styles.timeline}>
      <div>
        <dt>{labels.start}</dt>
        <dd>{timeline.start_date ?? labels.notStated}</dd>
      </div>
      <div>
        <dt>{labels.expected}</dt>
        <dd>{timeline.expected_completion_date ?? labels.notStated}</dd>
      </div>
      <div>
        <dt>{labels.actual}</dt>
        <dd>{timeline.actual_completion_date ?? labels.notStated}</dd>
      </div>
    </dl>
  );
}
