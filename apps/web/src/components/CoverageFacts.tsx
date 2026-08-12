import { platformCoverage } from "@/lib/coverage";

const facts = [
  {
    value: platformCoverage.jurisdictionsStructured,
    label: "States & UTs in the coverage structure",
  },
  {
    value: platformCoverage.sectorsStructured,
    label: "Public-sector directories prepared",
  },
  {
    value: platformCoverage.liveStateDatasets,
    label: "Reviewed state dataset currently live",
  },
  {
    value: "Required",
    label: "Official source for every official claim",
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
        <p>Platform coverage structure · not a government performance rating</p>
      </div>
    </section>
  );
}
