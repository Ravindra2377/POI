import { financialStages } from "@/lib/financial-stages";

const evidenceClasses = [
  {
    label: "Official record",
    detail:
      "Published by an identified government authority and linked to its source.",
    tone: "official",
  },
  {
    label: "Platform analysis",
    detail:
      "A transparent calculation or clearly marked inference from cited observations.",
    tone: "calculated",
  },
  {
    label: "Community record",
    detail:
      "Structured public experience, displayed separately and never treated as official fact.",
    tone: "community",
  },
] as const;

export default function Home() {
  return (
    <main>
      <nav className="nav" aria-label="Primary navigation">
        <a className="brand" href="#top" aria-label="Viksit Bharat?? home">
          <span className="brandMark">VB</span>
          <span>Viksit Bharat??</span>
        </a>
        <a href="/government-explorer">Government Explorer</a>
        <span className="stagePill">Geography foundation · Stage 1</span>
      </nav>

      <section className="hero" id="top">
        <div className="eyebrow">Andhra Pradesh civic intelligence</div>
        <h1>
          Where public money goes.
          <span>What people actually receive.</span>
        </h1>
        <p className="heroCopy">
          One evidence trail from government allocation to local delivery—built
          for public trust in Telugu and English.
        </p>
        <p className="telugu" lang="te">
          ప్రజా ధనం ఎక్కడికి వెళ్తుంది — ప్రజలకు ఏమి అందింది
        </p>
        <div className="notice" role="status">
          <strong>Reviewed Stage 1 baseline available.</strong> Browse 26
          district records and initial departments in the Government Explorer.
          Boundaries, community reports, and financial observations are not yet
          published.
        </div>
      </section>

      <section className="section" aria-labelledby="evidence-heading">
        <div className="sectionHeading">
          <span>01</span>
          <div>
            <p className="kicker">Trust architecture</p>
            <h2 id="evidence-heading">
              Three records. Never one blurred claim.
            </h2>
          </div>
        </div>
        <div className="evidenceGrid">
          {evidenceClasses.map((item) => (
            <article className="evidenceCard" key={item.label}>
              <span className={`signal ${item.tone}`} aria-hidden="true" />
              <h3>{item.label}</h3>
              <p>{item.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section chainSection" aria-labelledby="chain-heading">
        <div className="sectionHeading">
          <span>02</span>
          <div>
            <p className="kicker">Core data model</p>
            <h2 id="chain-heading">Follow every financial stage.</h2>
          </div>
        </div>
        <ol className="stageList">
          {financialStages.map((stage, index) => (
            <li key={stage.key}>
              <span className="stageNumber">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div>
                <strong>{stage.label}</strong>
                <span>{stage.description}</span>
              </div>
            </li>
          ))}
        </ol>
        <p className="chainNote">
          An announcement is not expenditure. Contract value is not public
          outcome. Every value keeps its own meaning, date, source, and review
          status.
        </p>
      </section>

      <footer>
        <p>Viksit Bharat?? · Public-interest infrastructure in development</p>
        <p>
          Independent civic platform · Not affiliated with the Government of
          India
        </p>
        <p lang="te">ఆంధ్రప్రదేశ్ ప్రజా సమాచార వేదిక</p>
      </footer>
    </main>
  );
}
