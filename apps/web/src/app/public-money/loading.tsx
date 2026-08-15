import { PageFooter } from "@/components/PageFooter";
import { SiteHeader } from "@/components/SiteHeader";

export default function LoadingPublicMoney() {
  return (
    <>
      <SiteHeader />
      <main id="main-content" className="shell page-intro" aria-busy="true">
        <p className="eyebrow">ANDHRA PRADESH · PREPARED DIRECTORY</p>
        <h1>AP Public Money</h1>
        <div className="page-state" role="status">
          Loading the public-money directory…
        </div>
      </main>
      <PageFooter />
    </>
  );
}
