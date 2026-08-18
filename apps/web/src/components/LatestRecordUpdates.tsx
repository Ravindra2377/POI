"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { getDistricts } from "@/lib/catalog-api";
import type {
  GeographyRecord,
  GovernmentBodyRecord,
} from "@/lib/catalog-types";
import { ErrorState, ReviewState } from "./RecordStatus";

type UpdateRecord =
  | { kind: "Geography"; record: GeographyRecord }
  | { kind: "Government body"; record: GovernmentBodyRecord };

export function LatestRecordUpdates() {
  const [records, setRecords] = useState<UpdateRecord[]>([]);
  const [stateNameById, setStateNameById] = useState<Record<string, string>>(
    {},
  );
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  const load = useCallback(async (signal?: AbortSignal) => {
    setState("loading");
    try {
      const districtsResponse = await getDistricts("", signal);
      const stateResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/api/v1/geographies?entity_type=state&page_size=40`,
        { headers: { Accept: "application/json" }, signal },
      );
      const stateData = stateResponse.ok
        ? ((await stateResponse.json()) as {
            data: GeographyRecord[];
          })
        : { data: [] };
      const statesByName: Record<string, string> = {};
      for (const item of stateData.data) {
        statesByName[item.id] = item.name_en;
      }
      setStateNameById(statesByName);
      const combined: UpdateRecord[] = [
        ...districtsResponse.data.map((record) => ({
          kind: "Geography" as const,
          record,
        })),
      ];
      combined.sort(
        (a, b) =>
          b.record.provenance.retrieval_date.localeCompare(
            a.record.provenance.retrieval_date,
          ) || a.record.name_en.localeCompare(b.record.name_en),
      );
      setRecords(combined.slice(0, 6));
      setState("ready");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setRecords([]);
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

  if (state === "loading") {
    return (
      <div className="table-state" role="status">
        Loading reviewed public-record updates…
      </div>
    );
  }
  if (state === "error") {
    return (
      <ErrorState
        message="The Stage 1 catalog API is unavailable."
        onRetry={() => void load()}
      />
    );
  }
  if (records.length === 0) {
    return (
      <div className="table-state">
        No reviewed public-record updates are available.
      </div>
    );
  }

  return (
    <div className="responsive-table">
      <table>
        <caption className="sr-only">
          Latest API-backed public-record updates
        </caption>
        <thead>
          <tr>
            <th scope="col">Record type</th>
            <th scope="col">Subject</th>
            <th scope="col">State / UT</th>
            <th scope="col">Review state</th>
            <th scope="col">Retrieved</th>
            <th scope="col">
              <span className="sr-only">Action</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {records.map(({ kind, record }) => (
            <tr key={record.id}>
              <td data-label="Record type">{kind}</td>
              <td data-label="Subject">
                <strong>{record.name_en}</strong>
              </td>
              <td data-label="State / UT">
                {record.parent_id
                  ? (stateNameById[record.parent_id] ?? "—")
                  : "—"}
              </td>
              <td data-label="Review state">
                <ReviewState provenance={record.provenance} />
              </td>
              <td data-label="Retrieved">{record.provenance.retrieval_date}</td>
              <td data-label="Action">
                <Link href="/geographies">Open record</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
