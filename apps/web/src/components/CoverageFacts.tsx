import { platformCoverage } from "@/lib/coverage";

const facts = [
  {
    value: platformCoverage.liveObservations.toLocaleString("en-IN"),
    label: "Reviewed official observations live",
  },
  {
    value: platformCoverage.budgetYears,
    label: "AP Annual Financial Statements parsed",
  },
  {
    value: `${platformCoverage.liveSchemes} Schemes`,
    label: "Official state scheme rules cited",
  },
  {
    value: "100%",
    label: "Immutable source record audit trail",
  },
];

export function CoverageFacts() {
  return (
    <section
      className="coverage-facts"
      aria-labelledby="coverage-facts-heading"
    >
      <div className="shell">
        <h2 className="sr-only" id="coverage-facts-heading">
          Platform coverage facts
        </h2>
        <dl>
          {facts.map((fact) => (
            <div key={fact.label}>
              <dd>{fact.value}</dd>
              <dt>{fact.label}</dt>
            </div>
          ))}
        </dl>
        <p>Verified public record pipeline · Andhra Pradesh 2014–2026</p>
      </div>
    </section>
  );
}
