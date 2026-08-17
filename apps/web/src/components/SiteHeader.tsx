"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useLocale } from "./LocaleProvider";
import { CoverageNotice } from "./CoverageNotice";

const primaryNavigation = [
  { href: "/schemes", label: "Schemes" },
  { href: "/public-money", label: "Public Money" },
  { href: "/projects", label: "Projects" },
  { href: "/activity", label: "Activity Stream" },
  { href: "/lists", label: "Civic Lists" },
  { href: "/government", label: "Government" },
  { href: "/know-your-constituency", label: "Know Your Constituency" },
  { href: "/my-area", label: "My Area" },
];

const secondaryNavigation = [
  { href: "/states", label: "All-India States" },
  { href: "/geographies", label: "Districts & Geographies" },
  { href: "/explore-data", label: "Explore Data" },
  { href: "/procurement", label: "Procurement" },
  { href: "/officeholders", label: "Officeholders" },
  { href: "/election-results", label: "Election Results" },
  { href: "/budget", label: "Budget" },
  { href: "/sources", label: "Sources" },
  { href: "/ingestion", label: "Ingestion" },
  { href: "/community", label: "Community" },
  { href: "/account", label: "Account" },
];

export function SiteHeader() {
  const pathname = usePathname() ?? "";
  const { locale, setLocale } = useLocale();
  const [open, setOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  const isSecondaryActive = secondaryNavigation.some((item) =>
    pathname.startsWith(item.href),
  );

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
            {primaryNavigation.map((item) => (
              <Link
                aria-current={
                  pathname.startsWith(item.href) ? "page" : undefined
                }
                className="nav-link-primary"
                href={item.href}
                key={item.href}
                onClick={() => {
                  setOpen(false);
                  setMoreOpen(false);
                }}
              >
                {item.label}
              </Link>
            ))}

            <div className="nav-dropdown-wrapper">
              <button
                className="more-menu-toggle"
                type="button"
                aria-expanded={moreOpen}
                aria-haspopup="true"
                data-active={isSecondaryActive}
                onClick={() => setMoreOpen((prev) => !prev)}
              >
                <span>More</span>
                <span className="dropdown-caret" aria-hidden="true">
                  ▾
                </span>
              </button>
              <div className="more-menu-popover" data-open={moreOpen || open}>
                {secondaryNavigation.map((item) => (
                  <Link
                    aria-current={
                      pathname.startsWith(item.href) ? "page" : undefined
                    }
                    className="nav-link-secondary"
                    href={item.href}
                    key={item.href}
                    onClick={() => {
                      setOpen(false);
                      setMoreOpen(false);
                    }}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
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
