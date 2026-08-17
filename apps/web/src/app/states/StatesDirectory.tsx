"use client";

import { useMemo, useState } from "react";
import { CoverageNotice } from "@/components/CoverageNotice";
import { languageName } from "@/lib/languages";
import { ALL_INDIA_STATES_UTS_DATA, type StateSummary } from "@/lib/states";

export function StatesDirectory() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "state" | "union_territory">(
    "all",
  );

  const filteredStates = useMemo(() => {
    return ALL_INDIA_STATES_UTS_DATA.filter((item) => {
      const matchesCategory = filter === "all" || item.category === filter;
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        item.name_en.toLowerCase().includes(q) ||
        item.name_native.toLowerCase().includes(q) ||
        item.iso_code.toLowerCase().includes(q) ||
        item.capital.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [search, filter]);

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
          Stage 11 — National Civic Coverage
        </div>
        <h1
          style={{
            fontSize: "2.25rem",
            fontWeight: "800",
            color: "#0f172a",
            marginBottom: "0.5rem",
          }}
        >
          All-India States & Union Territories Explorer
        </h1>
        <p
          style={{ color: "#475569", fontSize: "1.125rem", maxWidth: "800px" }}
        >
          Comprehensive civic intelligence across all <strong>28 States</strong>{" "}
          and <strong>8 Union Territories</strong> of India. Every
          administrative division is anchored to official Local Government
          Directory (LGD) source records, and every State and Union Territory
          lists its officially recognised local languages.
        </p>
      </header>

      <CoverageNotice />

      {/* Controls */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "1rem",
          alignItems: "center",
          justifyContent: "space-between",
          margin: "2rem 0",
          padding: "1rem",
          background: "#f8fafc",
          borderRadius: "0.75rem",
          border: "1px solid #e2e8f0",
        }}
      >
        <input
          type="search"
          placeholder="Search by state, capital, or code (e.g. Telangana, Amaravati, IN-DL)..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search States and Union Territories"
          style={{
            flex: "1 1 300px",
            padding: "0.625rem 1rem",
            borderRadius: "0.5rem",
            border: "1px solid #cbd5e1",
            fontSize: "0.95rem",
          }}
        />

        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            type="button"
            onClick={() => setFilter("all")}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "0.5rem",
              border: "none",
              cursor: "pointer",
              fontWeight: "600",
              background: filter === "all" ? "#0f172a" : "#e2e8f0",
              color: filter === "all" ? "#ffffff" : "#334155",
            }}
          >
            All (36)
          </button>
          <button
            type="button"
            onClick={() => setFilter("state")}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "0.5rem",
              border: "none",
              cursor: "pointer",
              fontWeight: "600",
              background: filter === "state" ? "#0f172a" : "#e2e8f0",
              color: filter === "state" ? "#ffffff" : "#334155",
            }}
          >
            States (28)
          </button>
          <button
            type="button"
            onClick={() => setFilter("union_territory")}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "0.5rem",
              border: "none",
              cursor: "pointer",
              fontWeight: "600",
              background: filter === "union_territory" ? "#0f172a" : "#e2e8f0",
              color: filter === "union_territory" ? "#ffffff" : "#334155",
            }}
          >
            Union Territories (8)
          </button>
        </div>
      </div>

      {/* Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
          gap: "1.5rem",
        }}
      >
        {filteredStates.map((st: StateSummary) => (
          <div
            key={st.iso_code}
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
                    padding: "0.2rem 0.5rem",
                    borderRadius: "0.25rem",
                    background: st.category === "state" ? "#dbeafe" : "#fef3c7",
                    color: st.category === "state" ? "#1e40af" : "#92400e",
                  }}
                >
                  {st.category === "state" ? "STATE" : "UNION TERRITORY"}
                </span>
                <span
                  style={{
                    fontSize: "0.85rem",
                    fontWeight: "600",
                    color: "#64748b",
                    fontFamily: "monospace",
                  }}
                >
                  {st.iso_code} · LGD:{st.lgd_code}
                </span>
              </div>

              <h2
                style={{
                  fontSize: "1.25rem",
                  fontWeight: "700",
                  color: "#0f172a",
                  margin: "0.25rem 0",
                }}
              >
                {st.name_en}
              </h2>
              <div
                style={{
                  fontSize: "0.95rem",
                  color: "#0d9488",
                  fontWeight: "600",
                  marginBottom: "0.75rem",
                }}
              >
                {st.name_native}
              </div>

              <div
                style={{
                  fontSize: "0.875rem",
                  color: "#475569",
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "0.5rem",
                  marginTop: "1rem",
                }}
              >
                <div>
                  <span
                    style={{
                      display: "block",
                      fontSize: "0.75rem",
                      color: "#94a3b8",
                    }}
                  >
                    Capital
                  </span>
                  <strong>{st.capital}</strong>
                </div>
                <div>
                  <span
                    style={{
                      display: "block",
                      fontSize: "0.75rem",
                      color: "#94a3b8",
                    }}
                  >
                    Official Languages
                  </span>
                  <strong style={{ fontWeight: "600", fontSize: "0.9rem" }}>
                    {st.official_languages
                      .map((code) => languageName(code))
                      .join(" · ")}
                  </strong>
                </div>
                <div>
                  <span
                    style={{
                      display: "block",
                      fontSize: "0.75rem",
                      color: "#94a3b8",
                    }}
                  >
                    Assembly Seats
                  </span>
                  <strong>
                    {st.assembly_seats > 0 ? st.assembly_seats : "N/A"}
                  </strong>
                </div>
                <div>
                  <span
                    style={{
                      display: "block",
                      fontSize: "0.75rem",
                      color: "#94a3b8",
                    }}
                  >
                    Lok Sabha Seats
                  </span>
                  <strong>{st.parliamentary_seats}</strong>
                </div>
                <div>
                  <span
                    style={{
                      display: "block",
                      fontSize: "0.75rem",
                      color: "#94a3b8",
                    }}
                  >
                    Official Domain
                  </span>
                  <a
                    href={st.official_website}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: "#2563eb",
                      textDecoration: "none",
                      wordBreak: "break-all",
                    }}
                  >
                    {st.official_website.replace("https://", "")}
                  </a>
                </div>
              </div>
            </div>

            <div
              style={{
                marginTop: "1.25rem",
                paddingTop: "0.75rem",
                borderTop: "1px solid #f1f5f9",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  fontSize: "0.75rem",
                  color: "#16a34a",
                  fontWeight: "600",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.25rem",
                }}
              >
                ● Official Source Verified
              </span>
              <button
                type="button"
                style={{
                  padding: "0.35rem 0.75rem",
                  borderRadius: "0.375rem",
                  border: "1px solid #cbd5e1",
                  background: "#ffffff",
                  color: "#0f172a",
                  fontSize: "0.85rem",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
                onClick={() =>
                  alert(`Exploring ${st.name_en} catalog records.`)
                }
              >
                Explore Records →
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
