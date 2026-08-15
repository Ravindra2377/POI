import { PageFooter } from "@/components/PageFooter";
import { SiteHeader } from "@/components/SiteHeader";

export default function LoadingMyArea() {
  return (
    <>
      <SiteHeader />
      <main id="main-content" className="shell page-intro" aria-busy="true">
        <p className="eyebrow">ANDHRA PRADESH · MY AREA</p>
        <h1>My Area</h1>
        <div className="page-state" role="status">
          Loading reviewed districts…
        </div>
      </main>
      <PageFooter />
    </>
  );
}
