import { platformCoverage } from "@/lib/coverage";

const facts = [
  {
    value: `${platformCoverage.liveStateDatasets} States & UTs`,
    label: "With reviewed official district records live",
  },
  {
    value: platformCoverage.reviewedDistrictBaseline.toLocaleString("en-IN"),
    label: "Reviewed districts across India",
  },
  {
    value: platformCoverage.liveObservations.toLocaleString("en-IN"),
    label: "Reviewed official observations live",
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
        <p>
          Reviewed public record pipeline · all 36 States &amp; Union
          Territories
        </p>
      </div>
    </section>
  );
}
