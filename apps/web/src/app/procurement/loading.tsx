import { PageFooter } from "@/components/PageFooter";
import { SiteHeader } from "@/components/SiteHeader";

export default function LoadingProcurement() {
  return (
    <>
      <SiteHeader />
      <main id="main-content" className="shell page-intro" aria-busy="true">
        <p className="eyebrow">PREPARED DIRECTORY</p>
        <h1>Procurement</h1>
        <div className="page-state" role="status">
          Loading the procurement directory…
        </div>
      </main>
      <PageFooter />
    </>
  );
}
