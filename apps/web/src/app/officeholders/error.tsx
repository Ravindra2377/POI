"use client";

import { PageFooter } from "@/components/PageFooter";
import { SiteHeader } from "@/components/SiteHeader";

export default function OfficeholdersError({ reset }: { reset: () => void }) {
  return (
    <>
      <SiteHeader />
      <main id="main-content" className="shell page-intro">
        <p className="eyebrow">PREPARED DIRECTORY</p>
        <h1>Officeholders are temporarily unavailable</h1>
        <div className="error-state" role="alert">
          <p>
            The page could not be prepared. No unreviewed role or term is being
            shown in its place.
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
