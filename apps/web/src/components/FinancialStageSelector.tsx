"use client";

import { useState } from "react";
import { financialStages } from "@/lib/financial-stages";

export function FinancialStageSelector() {
  type FinancialStageKey = (typeof financialStages)[number]["key"];
  const [selected, setSelected] = useState<FinancialStageKey>(
    financialStages[0].key,
  );
  const active =
    financialStages.find((stage) => stage.key === selected) ??
    financialStages[0];
  return (
    <div className="financial-selector">
      <ol aria-label="Public-money stages">
        {financialStages.map((stage, index) => (
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
          No reviewed finance records published
        </span>
      </div>
    </div>
  );
}
