import Link from "next/link";

export function PageFooter() {
  return (
    <footer className="site-footer">
      <div className="shell site-footer__inner">
        <div>
          <strong>FileKholo</strong>
          <p>Open the record. Follow the work.</p>
        </div>
        <nav aria-label="Footer navigation">
          <Link href="/sources">Methodology</Link>
          <Link href="/sources#coverage">Coverage</Link>
          <Link href="/professional">For professionals</Link>
          <Link href="/government-explorer">Andhra Pradesh data</Link>
        </nav>
        <div className="site-footer__legal">
          <Link className="footer-legal-button" href="/legal-basis">
            Legal &amp; constitutional basis
            <span aria-hidden="true">→</span>
          </Link>
          <p>Not affiliated with the Government of India.</p>
        </div>
      </div>
    </footer>
  );
}
