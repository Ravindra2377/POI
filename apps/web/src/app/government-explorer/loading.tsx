import { PageFooter } from "@/components/PageFooter";
import { SiteHeader } from "@/components/SiteHeader";

export default function LoadingGovernmentExplorer() {
  return (
    <>
      <SiteHeader />
      <main id="main-content" className="shell page-intro" aria-busy="true">
        <p className="eyebrow">ANDHRA PRADESH · REVIEWED DATASET</p>
        <h1>Government Explorer</h1>
        <div className="page-state" role="status">
          Loading Government Explorer…
        </div>
      </main>
      <PageFooter />
    </>
  );
}
