"use client";

import { PageFooter } from "@/components/PageFooter";
import { SiteHeader } from "@/components/SiteHeader";

export default function PublicMoneyError({ reset }: { reset: () => void }) {
  return (
    <>
      <SiteHeader />
      <main id="main-content" className="shell page-intro">
        <p className="eyebrow">ANDHRA PRADESH · PREPARED DIRECTORY</p>
        <h1>Public Money is temporarily unavailable</h1>
        <div className="error-state" role="alert">
          <p>
            The page could not be prepared. No unreviewed financial figure is
            being shown in its place.
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
