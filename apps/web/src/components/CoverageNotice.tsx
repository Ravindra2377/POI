import Link from "next/link";

export function CoverageNotice() {
  return (
    <div className="coverage-notice">
      <div className="shell coverage-notice__inner">
        <span>
          Andhra Pradesh is the first state live. National structure is ready.
        </span>
        <Link href="/sources#coverage">How coverage works</Link>
      </div>
    </div>
  );
}
