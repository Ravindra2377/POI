import Link from "next/link";

export function CoverageNotice() {
  return (
    <div className="coverage-notice">
      <div className="shell coverage-notice__inner">
        <span>
          All 36 States &amp; Union Territories are live with reviewed district
          records. Andhra Pradesh remains the first fully reviewed dataset.
        </span>
        <Link href="/sources#coverage">How coverage works</Link>
      </div>
    </div>
  );
}
