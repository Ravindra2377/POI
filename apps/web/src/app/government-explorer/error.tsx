"use client";

import { PageFooter } from "@/components/PageFooter";
import { SiteHeader } from "@/components/SiteHeader";

export default function GovernmentExplorerError({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <>
      <SiteHeader />
      <main id="main-content" className="shell page-intro">
        <p className="eyebrow">REVIEWED DATASET</p>
        <h1>Government Explorer is temporarily unavailable</h1>
        <div className="error-state" role="alert">
          <p>
            The page could not be prepared. No official record has been changed.
          </p>
          <button
            className="button button--secondary"
            onClick={reset}
            type="button"
          >
            Try again
          </button>
        </div>
      </main>
      <PageFooter />
    </>
  );
}
