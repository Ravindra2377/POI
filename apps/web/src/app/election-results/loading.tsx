import { PageFooter } from "@/components/PageFooter";
import { SiteHeader } from "@/components/SiteHeader";

export default function LoadingElectionResults() {
  return (
    <>
      <SiteHeader />
      <main id="main-content" className="shell page-intro" aria-busy="true">
        <p className="eyebrow">PREPARED DIRECTORY</p>
        <h1>Election Results</h1>
        <div className="page-state" role="status">
          Loading the election results catalogue…
        </div>
      </main>
      <PageFooter />
    </>
  );
}
