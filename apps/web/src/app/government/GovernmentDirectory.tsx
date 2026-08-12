"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ErrorState,
  EmptyState,
  ReviewState,
  SourceSummary,
} from "@/components/RecordStatus";
import {
  getGovernmentBodies,
  getPublicOffices,
  getRepresentatives,
} from "@/lib/catalog-api";
import type {
  GovernmentBodyRecord,
  PublicOfficeRecord,
  RepresentativeRecord,
} from "@/lib/catalog-types";

export function GovernmentDirectory() {
  const [bodies, setBodies] = useState<GovernmentBodyRecord[]>([]);
  const [offices, setOffices] = useState<PublicOfficeRecord[]>([]);
  const [representatives, setRepresentatives] = useState<
    RepresentativeRecord[]
  >([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [query, setQuery] = useState("");

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setState("loading");
      try {
        const [bodyPage, officePage, representativePage] = await Promise.all([
          getGovernmentBodies(query, signal),
          getPublicOffices(query, signal),
          getRepresentatives(query, signal),
        ]);
        setBodies(bodyPage.data);
        setOffices(officePage.data);
        setRepresentatives(representativePage.data);
        setState("ready");
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError")
          return;
        setState("error");
      }
    },
    [query],
  );

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => void load(controller.signal), 0);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [load]);

  return (
    <section className="section shell">
      <div className="directory-filter government-filter">
        <label htmlFor="government-search">Search government records</label>
        <input
          id="government-search"
          type="search"
          placeholder="Department, office or representative"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>
      {state === "loading" && (
        <div className="page-state" role="status">
          Loading government records…
        </div>
      )}
      {state === "error" && (
        <ErrorState
          message="The government catalog API is unavailable."
          onRetry={() => void load()}
        />
      )}
      {state === "ready" && (
        <>
          <section
            className="directory-section"
            aria-labelledby="bodies-heading"
          >
            <div className="section-heading section-heading--split">
              <div>
                <p className="eyebrow">ORGANISATIONS</p>
                <h2 id="bodies-heading">Government bodies and departments</h2>
              </div>
              <p>
                Current Stage 1 records cover the Andhra Pradesh government
                foundation and three initial sectors.
              </p>
            </div>
            {bodies.length === 0 ? (
              <EmptyState
                title="No government bodies found"
                description="No reviewed organisation records match this search."
              />
            ) : (
              <ul className="record-directory">
                {bodies.map((body) => (
                  <li key={body.id}>
                    <div>
                      <span>{body.body_type.replaceAll("_", " ")}</span>
                      <h3>{body.name_en}</h3>
                      {body.name_te && <p lang="te">{body.name_te}</p>}
                    </div>
                    <div>
                      <span>Sector</span>
                      <strong>{body.sector ?? "General government"}</strong>
                    </div>
                    <div>
                      <span>Validity</span>
                      <strong>
                        {body.valid_from ?? "Not stated"} —{" "}
                        {body.valid_to ?? "present"}
                      </strong>
                    </div>
                    <ReviewState provenance={body.provenance} />
                    <SourceSummary provenance={body.provenance} />
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section
            className="directory-section"
            id="offices"
            aria-labelledby="offices-heading"
          >
            <div className="section-heading">
              <p className="eyebrow">PUBLIC OFFICES</p>
              <h2 id="offices-heading">Offices and jurisdiction</h2>
            </div>
            {offices.length === 0 ? (
              <EmptyState
                title="Reviewed public-office records are not yet published"
                description="The Stage 1 schema and API support offices and jurisdictions, but the current reviewed seed contains none."
              />
            ) : (
              <ul className="record-directory">
                {offices.map((office) => (
                  <li key={office.id}>
                    <div>
                      <span>{office.office_type}</span>
                      <h3>{office.name_en}</h3>
                    </div>
                    <div>
                      <span>Validity</span>
                      <strong>
                        {office.valid_from ?? "Not stated"} —{" "}
                        {office.valid_to ?? "present"}
                      </strong>
                    </div>
                    <ReviewState provenance={office.provenance} />
                    <SourceSummary provenance={office.provenance} />
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section
            className="directory-section"
            id="representatives"
            aria-labelledby="representatives-heading"
          >
            <div className="section-heading">
              <p className="eyebrow">MINISTERS & REPRESENTATIVES</p>
              <h2 id="representatives-heading">
                Time-bound officeholder records
              </h2>
            </div>
            {representatives.length === 0 ? (
              <EmptyState
                title="Reviewed officeholder records are not yet published"
                description="No Union minister, state minister or representative is hard-coded here. Future records will require a sourced role, jurisdiction and valid term."
              />
            ) : (
              <ul className="record-directory">
                {representatives.map((representative) => (
                  <li key={representative.id}>
                    <div>
                      <span>Representative</span>
                      <h3>{representative.name_en}</h3>
                    </div>
                    <div>
                      <span>Valid term</span>
                      <strong>
                        {representative.valid_from ?? "Not stated"} —{" "}
                        {representative.valid_to ?? "present"}
                      </strong>
                    </div>
                    <ReviewState provenance={representative.provenance} />
                    <SourceSummary provenance={representative.provenance} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </section>
  );
}
