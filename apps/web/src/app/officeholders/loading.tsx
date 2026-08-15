import { PageFooter } from "@/components/PageFooter";
import { SiteHeader } from "@/components/SiteHeader";

export default function LoadingOfficeholders() {
  return (
    <>
      <SiteHeader />
      <main id="main-content" className="shell page-intro" aria-busy="true">
        <p className="eyebrow">ANDHRA PRADESH · PREPARED DIRECTORY</p>
        <h1>AP Officeholders</h1>
        <div className="page-state" role="status">
          Loading the officeholder directory…
        </div>
      </main>
      <PageFooter />
    </>
  );
}
