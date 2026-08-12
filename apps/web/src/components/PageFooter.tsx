import Link from "next/link";

export function PageFooter() {
  return (
    <footer className="site-footer">
      <div className="shell site-footer__inner">
        <div>
          <strong>Viksit Bharat??</strong>
          <p>Independent civic infrastructure for inspecting public records.</p>
        </div>
        <nav aria-label="Footer navigation">
          <Link href="/sources">Methodology</Link>
          <Link href="/sources#coverage">Coverage</Link>
          <Link href="/government-explorer">Andhra Pradesh data</Link>
        </nav>
        <p className="site-footer__legal">
          Not affiliated with the Government of India.
        </p>
      </div>
    </footer>
  );
}
