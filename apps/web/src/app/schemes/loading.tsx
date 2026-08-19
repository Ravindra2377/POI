import { PageFooter } from "@/components/PageFooter";
import { SiteHeader } from "@/components/SiteHeader";

export default function LoadingSchemes() {
  return (
    <>
      <SiteHeader />
      <main id="main-content" className="shell page-intro" aria-busy="true">
        <p className="eyebrow">REVIEWED DIRECTORY</p>
        <h1>Schemes</h1>
        <div className="page-state" role="status">
          Loading the scheme directory…
        </div>
      </main>
      <PageFooter />
    </>
  );
}
