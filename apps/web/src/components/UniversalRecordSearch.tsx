"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { indiaJurisdictions, sectors } from "@/lib/coverage";

export function UniversalRecordSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [state, setState] = useState("Andhra Pradesh");
  const [sector, setSector] = useState("All sectors");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    params.set("state", state);
    if (sector !== "All sectors") params.set("sector", sector);
    router.push(`/explore-data?${params.toString()}#directory`);
  }

  return (
    <form className="record-search" role="search" onSubmit={submit}>
      <div className="record-search__query">
        <label htmlFor="universal-query">Search government records</label>
        <input
          id="universal-query"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Scheme, project, minister, department or place"
        />
      </div>
      <div>
        <label htmlFor="universal-state">State or Union Territory</label>
        <select
          id="universal-state"
          value={state}
          onChange={(event) => setState(event.target.value)}
        >
          {indiaJurisdictions.map((item) => (
            <option value={item.name} key={item.name}>
              {item.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="universal-sector">Sector</label>
        <select
          id="universal-sector"
          value={sector}
          onChange={(event) => setSector(event.target.value)}
        >
          <option>All sectors</option>
          {sectors.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </div>
      <button className="button button--primary" type="submit">
        Search records
      </button>
      <p className="record-search__coverage">
        Live district coverage spans all 36 States and Union Territories.
        Schemes, projects and minister records appear only after reviewed
        publication in their jurisdiction.
      </p>
    </form>
  );
}
