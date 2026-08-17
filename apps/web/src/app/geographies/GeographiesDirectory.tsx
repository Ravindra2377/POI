"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CoverageNotice } from "@/components/CoverageNotice";
import {
  ErrorState,
  EmptyState,
  ReviewState,
  SourceSummary,
} from "@/components/RecordStatus";
import { getDistrictsByState } from "@/lib/catalog-api";
import type { GeographyRecord } from "@/lib/catalog-types";
import { ALL_INDIA_STATES_UTS_DATA, getStateByIsoCode } from "@/lib/states";

function nativeLabel(district: GeographyRecord): string | null {
  if (district.name_te) return district.name_te;
  const nativeAlias = district.aliases.find(
    (alias) => alias.language !== "en" && alias.kind === "alternate",
  );
  return nativeAlias?.value ?? null;
}

export function GeographiesDirectory() {
  const [selectedStateIso, setSelectedStateIso] = useState<string>("IN-AP");
  const [search, setSearch] = useState<string>("");
  const [districts, setDistricts] = useState<GeographyRecord[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  const currentState = useMemo(
    () => getStateByIsoCode(selectedStateIso) || ALL_INDIA_STATES_UTS_DATA[0],
    [selectedStateIso],
  );

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setState("loading");
      try {
        const response = await getDistrictsByState(
          selectedStateIso,
          search,
          signal,
        );
        setDistricts(response.data);
        setState("ready");
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError")
          return;
        setState("error");
      }
    },
    [selectedStateIso, search],
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
    <div
      className="container"
      style={{ padding: "2rem 1rem", maxWidth: "1200px", margin: "0 auto" }}
    >
      <header style={{ marginBottom: "2rem" }}>
        <div
          style={{
            display: "inline-block",
            padding: "0.25rem 0.75rem",
            borderRadius: "9999px",
            background: "rgba(13, 148, 136, 0.1)",
            color: "#0d9488",
            fontWeight: "600",
            fontSize: "0.875rem",
            marginBottom: "0.75rem",
          }}
        >
          Stage 2.22 — All-India District & Geography Catalog
        </div>
        <h1
          style={{
            fontSize: "2.25rem",
            fontWeight: "800",
            color: "#0f172a",
            marginBottom: "0.5rem",
          }}
        >
          Districts & Administrative Divisions Explorer
        </h1>
        <p
          style={{ color: "#475569", fontSize: "1.125rem", maxWidth: "800px" }}
        >
          Reviewed Local Government Directory (LGD) district records covering
          all 36 States &amp; Union Territories of India. Districts appear here
          only when their LGD source has been ingested, reviewed and published.
        </p>
      </header>

      <CoverageNotice />

      {/* State Switcher Controls */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "1rem",
          alignItems: "center",
          justifyContent: "space-between",
          margin: "2rem 0",
          padding: "1.25rem",
          background: "#f8fafc",
          borderRadius: "0.75rem",
          border: "1px solid #e2e8f0",
        }}
      >
        <div
          style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}
        >
          <label
            htmlFor="state-select"
            style={{ fontSize: "0.85rem", fontWeight: "700", color: "#334155" }}
          >
            SELECT STATE / UNION TERRITORY
          </label>
          <select
            id="state-select"
            value={selectedStateIso}
            onChange={(e) => setSelectedStateIso(e.target.value)}
            style={{
              padding: "0.625rem 1rem",
              borderRadius: "0.5rem",
              border: "1px solid #cbd5e1",
              fontSize: "1rem",
              fontWeight: "600",
              color: "#0f172a",
              minWidth: "280px",
              background: "#ffffff",
            }}
          >
            {ALL_INDIA_STATES_UTS_DATA.map((st) => (
              <option key={st.iso_code} value={st.iso_code}>
                {st.name_en} ({st.name_native}) —{" "}
                {st.category === "state" ? "State" : "UT"}
              </option>
            ))}
          </select>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.25rem",
            flex: "1 1 280px",
          }}
        >
          <label
            htmlFor="district-search"
            style={{ fontSize: "0.85rem", fontWeight: "700", color: "#334155" }}
          >
            SEARCH DISTRICTS
          </label>
          <input
            id="district-search"
            type="search"
            placeholder={`Search ${currentState.name_en} districts or LGD codes...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              padding: "0.625rem 1rem",
              borderRadius: "0.5rem",
              border: "1px solid #cbd5e1",
              fontSize: "0.95rem",
              background: "#ffffff",
            }}
          />
        </div>
      </div>

      {/* Selected State Header Banner */}
      <div
        style={{
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
          color: "#ffffff",
          padding: "1.5rem",
          borderRadius: "0.75rem",
          marginBottom: "1.5rem",
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "1rem",
        }}
      >
        <div>
          <span
            style={{
              fontSize: "0.8rem",
              color: "#94a3b8",
              fontWeight: "700",
              letterSpacing: "0.05em",
            }}
          >
            STATE GEOGRAPHY PROFILE
          </span>
          <h2
            style={{
              fontSize: "1.75rem",
              fontWeight: "800",
              margin: "0.25rem 0",
              color: "#ffffff",
            }}
          >
            {currentState.name_en}{" "}
            <span
              style={{
                color: "#38bdf8",
                fontWeight: "600",
                fontSize: "1.25rem",
              }}
            >
              ({currentState.name_native})
            </span>
          </h2>
          <p style={{ margin: 0, fontSize: "0.95rem", color: "#cbd5e1" }}>
            Capital: <strong>{currentState.capital}</strong> · ISO:{" "}
            <strong>{currentState.iso_code}</strong> · LGD Code:{" "}
            <strong>{currentState.lgd_code}</strong>
          </p>
        </div>

        <div style={{ display: "flex", gap: "1rem" }}>
          <div
            style={{
              background: "rgba(255,255,255,0.1)",
              padding: "0.75rem 1.25rem",
              borderRadius: "0.5rem",
              textAlign: "center",
            }}
          >
            <span
              style={{
                display: "block",
                fontSize: "1.5rem",
                fontWeight: "800",
                color: "#38bdf8",
              }}
            >
              {state === "ready" ? districts.length : "–"}
            </span>
            <span
              style={{
                fontSize: "0.75rem",
                color: "#94a3b8",
                fontWeight: "600",
              }}
            >
              Reviewed Districts
            </span>
          </div>
          <div
            style={{
              background: "rgba(255,255,255,0.1)",
              padding: "0.75rem 1.25rem",
              borderRadius: "0.5rem",
              textAlign: "center",
            }}
          >
            <span
              style={{
                display: "block",
                fontSize: "1.5rem",
                fontWeight: "800",
                color: "#4ade80",
              }}
            >
              {currentState.assembly_seats}
            </span>
            <span
              style={{
                fontSize: "0.75rem",
                color: "#94a3b8",
                fontWeight: "600",
              }}
            >
              Assembly Seats
            </span>
          </div>
        </div>
      </div>

      {state === "loading" && (
        <div className="page-state" role="status">
          Loading {currentState.name_en} district records…
        </div>
      )}
      {state === "error" && (
        <ErrorState
          message="The district catalog API is unavailable."
          onRetry={() => void load()}
        />
      )}
      {state === "ready" && districts.length === 0 && (
        <EmptyState
          title={`No reviewed districts published for ${currentState.name_en}`}
          description="The LGD district feed for this State or Union Territory has not yet been ingested, reviewed and published. District records appear only after an official source has been stored and its observations reviewed."
        />
      )}
      {state === "ready" && districts.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "1.25rem",
          }}
        >
          {districts.map((district) => {
            const nativeName = nativeLabel(district);
            return (
              <div
                key={district.id}
                style={{
                  background: "#ffffff",
                  borderRadius: "0.75rem",
                  border: "1px solid #e2e8f0",
                  padding: "1.25rem",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                }}
              >
                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "0.5rem",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "0.75rem",
                        fontWeight: "700",
                        color: "#0d9488",
                        background: "rgba(13,148,136,0.1)",
                        padding: "0.2rem 0.5rem",
                        borderRadius: "0.25rem",
                      }}
                    >
                      DISTRICT
                    </span>
                    {district.official_code && (
                      <span
                        style={{
                          fontSize: "0.85rem",
                          fontWeight: "600",
                          color: "#64748b",
                          fontFamily: "monospace",
                        }}
                      >
                        LGD:{district.official_code}
                      </span>
                    )}
                  </div>

                  <h3
                    style={{
                      fontSize: "1.25rem",
                      fontWeight: "700",
                      color: "#0f172a",
                      margin: "0.25rem 0",
                    }}
                  >
                    {district.name_en}
                  </h3>
                  {nativeName && (
                    <div
                      style={{
                        fontSize: "1rem",
                        color: "#2563eb",
                        fontWeight: "600",
                        marginBottom: "0.75rem",
                      }}
                    >
                      {nativeName}
                    </div>
                  )}

                  <div style={{ fontSize: "0.85rem", color: "#64748b" }}>
                    {district.coverage_note ??
                      "Identifier-level record from the reviewed LGD district feed."}
                  </div>
                </div>

                <div
                  style={{
                    marginTop: "1rem",
                    paddingTop: "0.75rem",
                    borderTop: "1px solid #f1f5f9",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.35rem",
                  }}
                >
                  <ReviewState provenance={district.provenance} />
                  <SourceSummary provenance={district.provenance} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
