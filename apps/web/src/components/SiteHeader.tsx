"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useLocale } from "./LocaleProvider";
import { CoverageNotice } from "./CoverageNotice";

const navigation = [
  { href: "/explore-data", label: "Explore Data" },
  { href: "/schemes", label: "Schemes" },
  { href: "/projects", label: "Projects" },
  { href: "/public-money", label: "Public Money" },
  { href: "/procurement", label: "Procurement" },
  { href: "/officeholders", label: "Officeholders" },
  { href: "/my-area", label: "My Area" },
  { href: "/government", label: "Government" },
  { href: "/sources", label: "Sources" },
  { href: "/community", label: "Community" },
  { href: "/account", label: "Account" },
];

export function SiteHeader() {
  const pathname = usePathname() ?? "";
  const { locale, setLocale } = useLocale();
  const [open, setOpen] = useState(false);

  return (
    <>
      <CoverageNotice />
      <header className="site-header">
        <div className="shell site-header__inner">
          <Link className="wordmark" href="/" aria-label="Viksit Bharat?? home">
            <span>Viksit Bharat??</span>
            <small>PUBLIC RECORD</small>
          </Link>
          <button
            className="menu-button"
            type="button"
            aria-expanded={open}
            aria-controls="primary-navigation"
            onClick={() => setOpen((current) => !current)}
          >
            <span aria-hidden="true">☰</span>
            <span>Menu</span>
          </button>
          <nav
            className="primary-nav"
            id="primary-navigation"
            aria-label="Primary navigation"
            data-open={open}
          >
            {navigation.map((item) => (
              <Link
                aria-current={
                  pathname.startsWith(item.href) ? "page" : undefined
                }
                href={item.href}
                key={item.href}
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="language-control">
            <span className="language-control__icon" aria-hidden="true">
              🌐
            </span>
            <label className="sr-only" htmlFor="site-language">
              Select language
            </label>
            <select
              id="site-language"
              value={locale}
              onChange={(event) =>
                setLocale(event.currentTarget.value === "te" ? "te" : "en")
              }
            >
              <option value="en">English</option>
              <option value="te">తెలుగు</option>
            </select>
          </div>
        </div>
      </header>
    </>
  );
}
