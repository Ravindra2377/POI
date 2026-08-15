import type { ProvenanceSummary } from "@/lib/catalog-types";

export function ReviewState({ provenance }: { provenance: ProvenanceSummary }) {
  const label = provenance.is_fixture
    ? "Development fixture"
    : provenance.review_status === "reviewed"
      ? "Reviewed"
      : "Review pending";
  return (
    <span
      className="status-label"
      data-state={provenance.is_fixture ? "fixture" : provenance.review_status}
    >
      {label}
    </span>
  );
}

function formatUrlDisplay(url: string) {
  try {
    const parsed = new URL(url);
    const path =
      parsed.pathname.length > 25
        ? parsed.pathname.slice(0, 25) + "…"
        : parsed.pathname;
    return `${parsed.hostname}${path}`;
  } catch {
    return url.length > 40 ? url.slice(0, 40) + "…" : url;
  }
}

export function SourceSummary({
  provenance,
}: {
  provenance: ProvenanceSummary;
}) {
  const linkUrl =
    provenance.public_source_url ?? provenance.official_source_url;
  const showsRecordedEndpoint =
    provenance.public_source_url &&
    provenance.public_source_url !== provenance.official_source_url;
  return (
    <div className="source-summary">
      <span>Official source</span>
      <a href={linkUrl} target="_blank" rel="noreferrer">
        {provenance.source_name}
      </a>
      {showsRecordedEndpoint && (
        <small title={provenance.official_source_url}>
          Recorded from: {formatUrlDisplay(provenance.official_source_url)}
        </small>
      )}
      <small>Retrieved {provenance.retrieval_date}</small>
    </div>
  );
}

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="empty-state">
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="error-state" role="alert">
      <strong>Records could not be loaded</strong>
      <p>{message}</p>
      <button
        className="button button--secondary"
        onClick={onRetry}
        type="button"
      >
        Retry
      </button>
    </div>
  );
}
