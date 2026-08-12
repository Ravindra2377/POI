"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ErrorState } from "@/components/RecordStatus";
import { getDepartments, getDistricts } from "@/lib/catalog-api";
import type { ProvenanceSummary } from "@/lib/catalog-types";

const classifications = [
  {
    name: "Official",
    description:
      "Published by an identified public authority and linked to an official URL.",
  },
  {
    name: "Calculated",
    description:
      "A deterministic platform calculation whose official inputs and method must be shown.",
  },
  {
    name: "Inferred",
    description:
      "A platform interpretation with uncertainty and review state displayed.",
  },
  {
    name: "Community-reported",
    description:
      "A participant submission kept separate from official records and not independently verified by default.",
  },
];

export function SourcesDirectory() {
  const [sources, setSources] = useState<ProvenanceSummary[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const load = useCallback(async (signal?: AbortSignal) => {
    setState("loading");
    try {
      const [districts, departments] = await Promise.all([
        getDistricts("", signal),
        getDepartments("", signal),
      ]);
      const byId = new Map<string, ProvenanceSummary>();
      for (const record of [...districts.data, ...departments.data])
        byId.set(record.provenance.source_id, record.provenance);
      setSources(
        [...byId.values()].sort((a, b) =>
          a.source_name.localeCompare(b.source_name),
        ),
      );
      setState("ready");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setSources([]);
      setState("error");
    }
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => void load(controller.signal), 0);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [load]);
  const reviewedCount = useMemo(
    () =>
      sources.filter(
        (source) => source.review_status === "reviewed" && !source.is_fixture,
      ).length,
    [sources],
  );

  return (
    <>
      <section
        className="section shell"
        aria-labelledby="classifications-heading"
      >
        <div className="section-heading">
          <p className="eyebrow">EVIDENCE CLASSIFICATION</p>
          <h2 id="classifications-heading">
            Four labels with different meanings
          </h2>
        </div>
        <div className="classification-grid">
          {classifications.map((item, index) => (
            <article key={item.name}>
              <span
                className="classification-mark"
                data-kind={
                  ["official", "calculated", "inferred", "community"][index]
                }
              />
              <h3>{item.name}</h3>
              <p>{item.description}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="section section--tinted" id="coverage">
        <div className="shell source-method">
          <div>
            <p className="eyebrow">CURRENT COVERAGE</p>
            <h2>Stage 1 source-reference bridge</h2>
          </div>
          <div>
            <p>
              Andhra Pradesh is the first reviewed state dataset. The current
              bridge records source name, official URL, retrieval and
              publication/effective dates, review state and fixture status.
            </p>
            <p>
              It does <strong>not</strong> yet claim immutable raw snapshots,
              checksums, extraction runs, observation chains or corrections.
              Those remain Stage 2.
            </p>
          </div>
        </div>
      </section>
      <section className="section shell" aria-labelledby="source-list-heading">
        <div className="section-heading section-heading--split">
          <div>
            <p className="eyebrow">API-BACKED SOURCE REFERENCES</p>
            <h2 id="source-list-heading">Sources supporting live records</h2>
          </div>
          <p>
            {state === "ready"
              ? `${reviewedCount} reviewed source reference${reviewedCount === 1 ? "" : "s"} currently returned`
              : "Loading source references"}
          </p>
        </div>
        {state === "loading" && (
          <div className="page-state" role="status">
            Loading source references…
          </div>
        )}
        {state === "error" && (
          <ErrorState
            message="The Stage 1 source references could not be loaded."
            onRetry={() => void load()}
          />
        )}
        {state === "ready" && (
          <ul className="source-list">
            {sources.map((source) => (
              <li key={source.source_id}>
                <div>
                  <span
                    className="status-label"
                    data-state={
                      source.is_fixture ? "fixture" : source.review_status
                    }
                  >
                    {source.is_fixture
                      ? "Development fixture"
                      : source.review_status}
                  </span>
                  <h3>{source.source_name}</h3>
                </div>
                <dl>
                  <div>
                    <dt>Retrieved</dt>
                    <dd>{source.retrieval_date}</dd>
                  </div>
                  <div>
                    <dt>Published</dt>
                    <dd>{source.publication_date ?? "Not stated"}</dd>
                  </div>
                  <div>
                    <dt>Effective</dt>
                    <dd>{source.effective_date ?? "Not stated"}</dd>
                  </div>
                </dl>
                <a
                  href={source.official_source_url}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open official source
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="section shell" id="future-sources">
        <div className="empty-state">
          <h3>CAG reports are in the future source-review queue</h3>
          <p>
            No CAG ingestion or report claims were added in this frontend task.
            Each source requires separate access, terms, mapping and review
            work.
          </p>
        </div>
      </section>
    </>
  );
}
