"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLocale } from "@/components/LocaleProvider";
import { PageFooter } from "@/components/PageFooter";
import { SiteHeader } from "@/components/SiteHeader";
import {
  filterBudget,
  getBudget,
  localizedBudgetText,
  type BudgetFilters,
  type BudgetLine,
} from "@/lib/budget";
import { OfficialBudgetClaim } from "./OfficialBudgetClaim";
import styles from "./budget.module.css";

const copy = {
  en: {
    eyebrow: "ANDHRA PRADESH · PREPARED DIRECTORY",
    title: "AP Budget",
    intro:
      "A source-first directory for reviewed Andhra Pradesh Annual Financial Statement major heads.",
    prepared: "Prepared directory · No reviewed budget lines",
    preparedText:
      "The routes and filters are ready. No budget figure is published until source and bilingual review is complete.",
    ruleFigure: "A budget figure is a request, not a spent amount.",
    filters: "Filter reviewed budget lines",
    statement: "Statement",
    fiscalYear: "Fiscal year",
    unit: "Unit",
    allStatements: "All statements",
    allYears: "All fiscal years",
    allUnits: "All units",
    loading: "Loading the reviewed budget catalogue…",
    emptyTitle: "No reviewed budget lines are published yet",
    emptyText:
      "This is an intentionally empty prepared-data state, not a claim that Andhra Pradesh has no budget lines.",
    noMatchTitle: "No reviewed budget lines match these filters",
    noMatchText: "Change one or more filters to see other reviewed lines.",
    errorTitle: "Budget lines could not be loaded",
    errorText:
      "The prepared catalogue is temporarily unavailable. No budget figure is being substituted.",
    retry: "Retry",
    observation: "Observation",
    budgetEstimate: "Budget estimate",
    unitLabel: "Unit",
    fiscalYearLabel: "Fiscal year",
    detailLink: "View major head",
    statementRevenueReceipts: "Revenue Receipts",
    statementCapitalReceipts: "Capital Receipts",
    statementPublicAccountReceipts: "Public Account Receipts",
    statementRevenueExpenditure: "Revenue Expenditure",
    statementCapitalExpenditure: "Capital Expenditure",
    statementPublicDebt: "Public Debt",
    statementPublicAccountDisbursements: "Public Account Disbursements",
  },
  te: {
    eyebrow: "ఆంధ్రప్రదేశ్ · సిద్ధం చేసిన డైరెక్టరీ",
    title: "ఆంధ్రప్రదేశ్ బడ్జెట్",
    intro:
      "సమీక్షించిన ఆంధ్రప్రదేశ్ వార్షిక ఆర్థిక ప్రకటన ముఖ్య శీర్షికల కోసం మూలాధార-కేంద్రీకృత డైరెక్టరీ.",
    prepared: "సిద్ధం చేసిన డైరెక్టరీ · సమీక్షించిన బడ్జెట్ లైన్లు లేవు",
    preparedText:
      "మార్గాలు, ఫిల్టర్లు సిద్ధంగా ఉన్నాయి. మూలం మరియు ద్విభాషా సమీక్ష పూర్తయ్యే వరకు ఎలాంటి బడ్జెట్ గణాంకం ప్రచురించబడదు.",
    ruleFigure: "బడ్జెట్ గణాంకం ఒక కోరిక, వ్యయం కాదు.",
    filters: "సమీక్షించిన బడ్జెట్ లైన్లను ఫిల్టర్ చేయండి",
    statement: "ప్రకటన",
    fiscalYear: "ఆర్థిక సంవత్సరం",
    unit: "యూనిట్",
    allStatements: "అన్ని ప్రకటనలు",
    allYears: "అన్ని ఆర్థిక సంవత్సరాలు",
    allUnits: "అన్ని యూనిట్లు",
    loading: "సమీక్షించిన బడ్జెట్ జాబితా లోడ్ అవుతోంది…",
    emptyTitle: "సమీక్షించిన బడ్జెట్ లైన్లు ఇంకా ప్రచురించబడలేదు",
    emptyText:
      "ఇది ఉద్దేశపూర్వకంగా ఖాళీగా ఉన్న సిద్ధం చేసిన డేటా స్థితి; ఆంధ్రప్రదేశ్‌లో బడ్జెట్ లైన్లు లేవని చెప్పడం కాదు.",
    noMatchTitle: "ఈ ఫిల్టర్లకు సరిపోలే సమీక్షించిన బడ్జెట్ లైన్లు లేవు",
    noMatchText: "ఇతర సమీక్షించిన లైన్ల కోసం ఫిల్టర్లను మార్చండి.",
    errorTitle: "బడ్జెట్ లైన్లను లోడ్ చేయలేకపోయాము",
    errorText:
      "సిద్ధం చేసిన జాబితా తాత్కాలికంగా అందుబాటులో లేదు. ప్రత్యామ్నాయ బడ్జెట్ గణాంకం చూపబడదు.",
    retry: "మళ్లీ ప్రయత్నించండి",
    observation: "పరిశీలన",
    budgetEstimate: "బడ్జెట్ అంచనా",
    unitLabel: "యూనిట్",
    fiscalYearLabel: "ఆర్థిక సంవత్సరం",
    detailLink: "ముఖ్య శీర్షిక చూడండి",
    statementRevenueReceipts: "రెవెన్యూ రశీదులు",
    statementCapitalReceipts: "మూలధన రశీదులు",
    statementPublicAccountReceipts: "ప్రభుత్వ అకౌంట్ రశీదులు",
    statementRevenueExpenditure: "రెవెన్యూ వ్యయం",
    statementCapitalExpenditure: "మూలధన వ్యయం",
    statementPublicDebt: "ప్రభుత్వ రుణం",
    statementPublicAccountDisbursements: "ప్రభుత్వ అకౌంట్ చెల్లింపులు",
  },
} as const;

type Copy = { [Key in keyof (typeof copy)["en"]]: string };

function statementLabel(statement: string, labels: Copy): string {
  if (statement === "revenue_receipts") return labels.statementRevenueReceipts;
  if (statement === "capital_receipts") return labels.statementCapitalReceipts;
  if (statement === "public_account_receipts")
    return labels.statementPublicAccountReceipts;
  if (statement === "revenue_expenditure")
    return labels.statementRevenueExpenditure;
  if (statement === "capital_expenditure")
    return labels.statementCapitalExpenditure;
  if (statement === "public_debt") return labels.statementPublicDebt;
  if (statement === "public_account_disbursements")
    return labels.statementPublicAccountDisbursements;
  return statement;
}

const initialFilters: BudgetFilters = {
  statement: "",
  fiscalYear: "",
  unit: "",
};

function uniqueValues(
  lines: BudgetLine[],
  select: (line: BudgetLine) => string,
): string[] {
  return [...new Set(lines.map(select).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b),
  );
}

export function BudgetDirectory() {
  const { locale } = useLocale();
  const labels = copy[locale];
  const [lines, setLines] = useState<BudgetLine[]>([]);
  const [filters, setFilters] = useState<BudgetFilters>(initialFilters);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  async function load(signal?: AbortSignal) {
    setState("loading");
    try {
      const response = await getBudget(signal);
      setLines(response.data);
      setState("ready");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setLines([]);
      setState("error");
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => void load(controller.signal), 0);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, []);

  const statements = uniqueValues(lines, (line) => line.statement);
  const fiscalYears = uniqueValues(lines, (line) => line.fiscal_year);
  const units = uniqueValues(lines, (line) => line.unit);
  const filtered = filterBudget(lines, filters);

  function selectFilter<Key extends keyof BudgetFilters>(
    key: Key,
    value: BudgetFilters[Key],
  ) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  return (
    <>
      <SiteHeader />
      <main id="main-content">
        <header className="page-intro shell">
          <p className="eyebrow">{labels.eyebrow}</p>
          <h1>{labels.title}</h1>
          <p className="lede">{labels.intro}</p>
          <aside className={styles.notice} aria-label={labels.prepared}>
            <strong>{labels.prepared}</strong>
            <p>{labels.preparedText}</p>
          </aside>
        </header>

        <section className="money-rules">
          <div className="shell money-rules__grid">
            <strong>{labels.ruleFigure}</strong>
          </div>
        </section>

        <section className="section shell" aria-labelledby="budget-results">
          <h2 className="sr-only" id="budget-results">
            {labels.title}
          </h2>
          <fieldset className={styles.filters}>
            <legend className="sr-only">{labels.filters}</legend>
            <BudgetFilter
              id="budget-statement"
              label={labels.statement}
              allLabel={labels.allStatements}
              options={statements.map((statement) => ({
                value: statement,
                label: statementLabel(statement, labels),
              }))}
              value={filters.statement}
              onChange={(value) => selectFilter("statement", value)}
            />
            <BudgetFilter
              id="budget-fiscal-year"
              label={labels.fiscalYear}
              allLabel={labels.allYears}
              options={fiscalYears.map((year) => ({
                value: year,
                label: year,
              }))}
              value={filters.fiscalYear}
              onChange={(value) => selectFilter("fiscalYear", value)}
            />
            <BudgetFilter
              id="budget-unit"
              label={labels.unit}
              allLabel={labels.allUnits}
              options={units.map((unit) => ({ value: unit, label: unit }))}
              value={filters.unit}
              onChange={(value) => selectFilter("unit", value)}
            />
          </fieldset>

          <div className={styles.results} aria-live="polite">
            {state === "loading" && (
              <div className="page-state" role="status">
                {labels.loading}
              </div>
            )}
            {state === "error" && (
              <div className="error-state" role="alert">
                <h3>{labels.errorTitle}</h3>
                <p>{labels.errorText}</p>
                <button
                  className="button button--secondary"
                  onClick={() => void load()}
                  type="button"
                >
                  {labels.retry}
                </button>
              </div>
            )}
            {state === "ready" && lines.length === 0 && (
              <div className="empty-state">
                <h3>{labels.emptyTitle}</h3>
                <p>{labels.emptyText}</p>
              </div>
            )}
            {state === "ready" && lines.length > 0 && filtered.length === 0 && (
              <div className="empty-state">
                <h3>{labels.noMatchTitle}</h3>
                <p>{labels.noMatchText}</p>
              </div>
            )}
            {state === "ready" && filtered.length > 0 && (
              <ul className={styles.records}>
                {filtered.map((line) => (
                  <li key={line.slug}>
                    <div>
                      <OfficialBudgetClaim
                        label={labels.observation}
                        source={line.name.source}
                      >
                        <h2 lang={locale}>
                          <Link href={`/budget/${line.slug}`}>
                            {localizedBudgetText(line.name.value, locale)}
                          </Link>
                        </h2>
                      </OfficialBudgetClaim>
                      <p lang={locale}>
                        {statementLabel(line.statement, labels)} ·{" "}
                        {line.fiscal_year}
                      </p>
                    </div>
                    <div className={styles.claimGrid}>
                      <OfficialBudgetClaim
                        label={labels.budgetEstimate}
                        source={line.budget_estimate.source}
                      >
                        <span lang={locale}>
                          {localizedBudgetText(
                            line.budget_estimate.value,
                            locale,
                          )}
                        </span>{" "}
                        <small>{line.unit}</small>
                      </OfficialBudgetClaim>
                      <OfficialBudgetClaim
                        label={labels.fiscalYearLabel}
                        source={line.source}
                      >
                        {line.fiscal_year}
                      </OfficialBudgetClaim>
                      <OfficialBudgetClaim
                        label={labels.unitLabel}
                        source={line.source}
                      >
                        {line.unit}
                      </OfficialBudgetClaim>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </main>
      <PageFooter />
    </>
  );
}

function BudgetFilter({
  id,
  label,
  allLabel,
  options,
  value,
  onChange,
}: {
  id: string;
  label: string;
  allLabel: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
      >
        <option value="">{allLabel}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
