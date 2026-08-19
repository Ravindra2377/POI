"use client";

interface ApOnlyCatalogNoticeProps {
  jurisdiction: string;
  onViewAp?: () => void;
}

export function ApOnlyCatalogNotice({
  jurisdiction,
  onViewAp,
}: ApOnlyCatalogNoticeProps) {
  return (
    <div className="empty-state">
      <h3>No reviewed records are published for {jurisdiction} yet</h3>
      <p>
        Reviewed records in this catalogue are currently published only for
        Andhra Pradesh. The State/UT selector reflects the national structure;
        other jurisdictions publish here only after source review.
      </p>
      {onViewAp ? (
        <button
          className="button button--secondary"
          type="button"
          onClick={onViewAp}
        >
          View Andhra Pradesh records
        </button>
      ) : null}
    </div>
  );
}
