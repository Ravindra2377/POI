"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ErrorState,
  ReviewState,
  SourceSummary,
} from "@/components/RecordStatus";
import { getDepartments, getDistricts } from "@/lib/catalog-api";
import type {
  GeographyRecord,
  GovernmentBodyRecord,
} from "@/lib/catalog-types";
import { indiaJurisdictions, sectors } from "@/lib/coverage";

type DirectoryMode = "states" | "sectors";
type SearchRecord = GeographyRecord | GovernmentBodyRecord;

function isGeography(record: SearchRecord): record is GeographyRecord {
  return "entity_type" in record;
}

export function ExploreData() {
  const params = useSearchParams();
  const initialSector = params.get("sector") ?? "";
  const initialQuery = params.get("q") ?? "";
  const initialState = params.get("state") ?? "Andhra Pradesh";
  const [mode, setMode] = useState<DirectoryMode>(
    initialSector ? "sectors" : "states",
  );
  const [directoryQuery, setDirectoryQuery] = useState("");
  const [records, setRecords] = useState<SearchRecord[]>([]);
  const [recordState, setRecordState] = useState<
    "idle" | "loading" | "ready" | "error"
  >(initialQuery ? "loading" : "idle");

  const loadRecords = useCallback(async () => {
    if (!initialQuery || initialState !== "Andhra Pradesh") return;
    setRecordState("loading");
    try {
      const [districts, bodies] = await Promise.all([
        getDistricts(initialQuery),
        getDepartments(initialQuery),
      ]);
      setRecords([...districts.data, ...bodies.data]);
      setRecordState("ready");
    } catch {
      setRecords([]);
      setRecordState("error");
    }
  }, [initialQuery, initialState]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadRecords(), 0);
    return () => window.clearTimeout(timer);
  }, [loadRecords]);

  const jurisdictions = useMemo(
    () =>
      indiaJurisdictions.filter((item) =>
        item.name
          .toLocaleLowerCase()
          .includes(directoryQuery.toLocaleLowerCase()),
      ),
    [directoryQuery],
  );
  const visibleSectors = useMemo(
    () =>
      sectors.filter((item) =>
        item.toLocaleLowerCase().includes(directoryQuery.toLocaleLowerCase()),
      ),
    [directoryQuery],
  );

  return (
    <>
      <header className="page-intro shell">
        <p className="eyebrow">EXPLORE PUBLIC DATA</p>
        <h1>India-wide structure. Reviewed records where available.</h1>
        <p className="lede">
          Browse administrative coverage and public sectors without confusing
          planned structure with published official data.
        </p>
      </header>

      <section
        className="section shell"
        id="directory"
        aria-labelledby="directory-heading"
      >
        <div className="directory-toolbar">
          <div>
            <h2 id="directory-heading">Data directory</h2>
            <div
              className="directory-tabs"
              role="tablist"
              aria-label="Data directory mode"
            >
              <button
                role="tab"
                type="button"
                aria-selected={mode === "states"}
                onClick={() => setMode("states")}
              >
                States and Union Territories
              </button>
              <button
                role="tab"
                type="button"
                aria-selected={mode === "sectors"}
                onClick={() => setMode("sectors")}
              >
                Sectors
              </button>
            </div>
          </div>
          <div className="directory-filter">
            <label htmlFor="directory-filter">Filter directory</label>
            <input
              id="directory-filter"
              type="search"
              value={directoryQuery}
              onChange={(event) => setDirectoryQuery(event.target.value)}
              placeholder={
                mode === "states" ? "Search a state or UT" : "Search a sector"
              }
            />
          </div>
        </div>

        {mode === "states" ? (
          <ul className="directory-list" data-testid="state-directory">
            {jurisdictions.map((item) => (
              <li key={item.name}>
                <div>
                  <strong>{item.name}</strong>
                  {item.nameTe && <span lang="te">{item.nameTe}</span>}
                </div>
                <span>
                  {item.kind === "state" ? "State" : "Union Territory"}
                </span>
                <span className="coverage-status" data-status={item.status}>
                  {item.status === "live" ? "Reviewed data live" : "Planned"}
                </span>
                {item.route ? (
                  <Link href={item.route}>Explore</Link>
                ) : (
                  <span>Not yet available</span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <ul className="sector-list" data-testid="sector-directory">
            {visibleSectors.map((sector) => {
              const live =
                sector === "Health" ||
                sector === "Education" ||
                sector === "Roads and transport";
              return (
                <li key={sector}>
                  <div>
                    <strong>{sector}</strong>
                    <p>
                      {live
                        ? "Stage 1 department structure available in Andhra Pradesh."
                        : "Directory structure prepared; reviewed sector records not yet published."}
                    </p>
                  </div>
                  <span
                    className="coverage-status"
                    data-status={live ? "live" : "planned"}
                  >
                    {live ? "AP structure live" : "Planned"}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {(initialQuery || initialState !== "Andhra Pradesh") && (
        <section
          className="section shell"
          aria-labelledby="search-results-heading"
        >
          <div className="section-heading">
            <p className="eyebrow">SEARCH COVERAGE</p>
            <h2 id="search-results-heading">Current record results</h2>
          </div>
          {initialState !== "Andhra Pradesh" ? (
            <div className="empty-state">
              <h3>{initialState} is in the national structure</h3>
              <p>
                Reviewed public records for this jurisdiction are not yet
                published.
              </p>
            </div>
          ) : recordState === "loading" ? (
            <div className="table-state" role="status">
              Searching reviewed records…
            </div>
          ) : recordState === "error" ? (
            <ErrorState
              message="The Stage 1 catalog API is unavailable."
              onRetry={() => void loadRecords()}
            />
          ) : records.length === 0 ? (
            <div className="empty-state">
              <h3>No reviewed records match “{initialQuery}”</h3>
              <p>
                Current live search covers Andhra Pradesh districts and
                government bodies.
              </p>
            </div>
          ) : (
            <ul className="search-results">
              {records.map((record) => (
                <li key={record.id}>
                  <div>
                    <span>
                      {isGeography(record) ? "District" : "Government body"}
                    </span>
                    <h3>{record.name_en}</h3>
                    {record.name_te && <p lang="te">{record.name_te}</p>}
                  </div>
                  <ReviewState provenance={record.provenance} />
                  <SourceSummary provenance={record.provenance} />
                  <Link href="/government-explorer">Open in AP Explorer</Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </>
  );
}
