"use client";

import { useState } from "react";
import { procurementStages } from "@/lib/procurement";

export function ProcurementStageSelector() {
  type ProcurementStageKey = (typeof procurementStages)[number]["key"];
  const [selected, setSelected] = useState<ProcurementStageKey>(
    procurementStages[0].key,
  );
  const active =
    procurementStages.find((stage) => stage.key === selected) ??
    procurementStages[0];
  return (
    <div className="financial-selector">
      <ol aria-label="Procurement stages">
        {procurementStages.map((stage, index) => (
          <li key={stage.key}>
            <button
              type="button"
              aria-pressed={selected === stage.key}
              onClick={() => setSelected(stage.key)}
            >
              <span>{String(index + 1).padStart(2, "0")}</span>
              {stage.label}
            </button>
          </li>
        ))}
      </ol>
      <div className="financial-selector__detail" aria-live="polite">
        <p className="eyebrow">SELECTED STAGE</p>
        <h2>{active.label}</h2>
        <p>{active.description}</p>
        <span className="status-label" data-state="pending">
          No reviewed procurement records published
        </span>
      </div>
    </div>
  );
}
