"use client";

import Link from "next/link";
import { useLocale } from "@/components/LocaleProvider";
import { PageFooter } from "@/components/PageFooter";
import { SiteHeader } from "@/components/SiteHeader";
import {
  accountReportDomains,
  consentChoices,
  localizedAccountText,
} from "@/lib/accounts";
import styles from "./account.module.css";

const copy = {
  en: {
    eyebrow: "ACCOUNT · PREPARED",
    title: "Your account is not open yet",
    intro:
      "A reviewable account with consent controls is planned, not built. Nothing about you is collected today.",
    privacy: "Nothing is collected today",
    privacyText:
      "No email, password, phone, or precise location is collected or stored. There is no sign-up, no sign-in, and no saved preference. When accounts are built, consent will be explicit and reversible.",
    whatHeading: "What an account would be",
    whatText:
      "A reviewable identity with explicit consent controls, so structured reports and area alerts can be delivered only from published, reviewed records. None of that exists yet.",
    consentEyebrow: "CONSENT MODEL · PLANNED",
    consentHeading: "Consent choices are planned, not available",
    consentNote:
      "No consent choice can be made or stored yet. These are the choices the consent controls would offer once identity, privacy and audit controls are built.",
    planned: "Planned",
    reportsEyebrow: "STRUCTURED REPORTS",
    reportsHeading: "Structured reports are prepared, not published",
    reportsNote:
      "Each panel shows what a structured report would cover once reviewed records are published. Nothing is demonstrated.",
    reportsPending: "No reviewed records published yet",
    openDirectory: "Open the {domain} directory",
    controlsEyebrow: "REVIEW CONTROLS",
    controlsHeading: "Review controls come before accounts",
    controlsText:
      "Identity, moderation, appeals, abuse and audit controls must be implemented before any account exists, so no personal evidence, private message, or moderation action can be stored today. Every future moderation action will produce an audit record.",
  },
  te: {
    eyebrow: "ఖాతా · సిద్ధం",
    title: "మీ ఖాతా ఇంకా తెరవబడలేదు",
    intro:
      "సమీక్షించదగిన ఖాతా మరియు సమ్మతి నియంత్రణలు ప్రణాళికలో ఉన్నాయి, నిర్మించబడలేదు. మీ గురించి ఈరోజు ఏమీ సేకరించబడదు.",
    privacy: "ఈరోజు ఏమీ సేకరించబడదు",
    privacyText:
      "ఇమెయిల్, పాస్వర్డ్, ఫోన్ లేదా ఖచ్చితమైన స్థానం సేకరించబడదు లేదా నిల్వ చేయబడదు. సైన్-అప్ లేదు, సైన్-ఇన్ లేదు, సేవ్ చేసిన ప్రాధాన్యత లేదు. ఖాతాలు నిర్మించబడినప్పుడు సమ్మతి స్పష్టంగా మరియు రద్దు చేయదగినదిగా ఉంటుంది.",
    whatHeading: "ఖాతా అంటే ఏమిటి",
    whatText:
      "ప్రచురించిన, సమీక్షించిన రికార్డుల నుండి మాత్రమే నిర్మాణాత్మక నివేదికలు మరియు ప్రాంత హెచ్చరికలను అందించే స్పష్టమైన సమ్మతి నియంత్రణలతో కూడిన సమీక్షించదగిన గుర్తింపు. అది ఇంకా ఏదీ లేదు.",
    consentEyebrow: "సమ్మతి నమూనా · ప్రణాళిక",
    consentHeading: "సమ్మతి ఎంపికలు ప్రణాళికలో ఉన్నాయి, అందుబాటులో లేవు",
    consentNote:
      "ఇంకా ఎటువంటి సమ్మతి ఎంపిక చేయబడదు లేదా నిల్వ చేయబడదు. గుర్తింపు, గోప్యత మరియు ఆడిట్ నియంత్రణలు నిర్మించిన తర్వాత సమ్మతి నియంత్రణలు అందించే ఎంపికలు ఇవి.",
    planned: "ప్రణాళిక",
    reportsEyebrow: "నిర్మాణాత్మక నివేదికలు",
    reportsHeading: "నిర్మాణాత్మక నివేదికలు సిద్ధం, ప్రచురించబడలేదు",
    reportsNote:
      "సమీక్షించిన రికార్డులు ప్రచురించబడిన తర్వాత నిర్మాణాత్మక నివేదిక ఏమి కవర్ చేస్తుందో ప్రతి ప్యానెల్ చూపుతుంది. ఏదీ ప్రదర్శించబడదు.",
    reportsPending: "సమీక్షించిన రికార్డులు ఇంకా ప్రచురించబడలేదు",
    openDirectory: "{domain} డైరెక్టరీని తెరవండి",
    controlsEyebrow: "సమీక్ష నియంత్రణలు",
    controlsHeading: "ఖాతాల కంటే ముందు సమీక్ష నియంత్రణలు",
    controlsText:
      "ఏదైనా ఖాతా ఉనికిలో ఉండటానికి ముందు గుర్తింపు, మోడరేషన్, అప్పీళ్లు, దుర్వినియోగం మరియు ఆడిట్ నియంత్రణలు అమలు చేయాలి, కాబట్టి ఈరోజు వ్యక్తిగత ఆధారం, ప్రైవేట్ సందేశం లేదా మోడరేషన్ చర్య నిల్వ చేయబడదు. ప్రతి భవిష్యత్ మోడరేషన్ చర్య ఆడిట్ రికార్డును ఉత్పత్తి చేస్తుంది.",
  },
} as const;

function linkTitle(template: string, domain: string): string {
  return template.replace("{domain}", domain);
}

export function AccountContent() {
  const { locale } = useLocale();
  const labels = copy[locale];

  return (
    <>
      <SiteHeader />
      <main id="main-content">
        <header className="page-intro shell">
          <p className="eyebrow">{labels.eyebrow}</p>
          <h1>{labels.title}</h1>
          <p className="lede">{labels.intro}</p>
          <aside className={styles.notice} aria-label={labels.privacy}>
            <strong>{labels.privacy}</strong>
            <p>{labels.privacyText}</p>
          </aside>
        </header>

        <section className="section shell">
          <div className="section-heading section-heading--split">
            <div>
              <h2>{labels.whatHeading}</h2>
            </div>
            <p>{labels.whatText}</p>
          </div>
        </section>

        <section className="section shell" aria-labelledby="consent-heading">
          <div className="section-heading section-heading--split">
            <div>
              <p className="eyebrow">{labels.consentEyebrow}</p>
              <h2 id="consent-heading">{labels.consentHeading}</h2>
            </div>
            <p>{labels.consentNote}</p>
          </div>
          <ul className={styles.consentList}>
            {consentChoices.map((choice) => (
              <li key={choice.key} className={styles.consentItem}>
                <span className="status-label" data-state="pending">
                  {labels.planned}
                </span>
                <h3 lang={locale}>
                  {localizedAccountText(choice.label, locale)}
                </h3>
                <p>{localizedAccountText(choice.description, locale)}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="section shell" aria-labelledby="reports-heading">
          <div className="section-heading section-heading--split">
            <div>
              <p className="eyebrow">{labels.reportsEyebrow}</p>
              <h2 id="reports-heading">{labels.reportsHeading}</h2>
            </div>
            <p>{labels.reportsNote}</p>
          </div>
          <ul className={styles.reportGrid}>
            {accountReportDomains.map((domain) => (
              <li key={domain.key} className={styles.reportPanel}>
                <div>
                  <span className="status-label" data-state="pending">
                    {labels.reportsPending}
                  </span>
                  <h3 lang={locale}>
                    {localizedAccountText(domain.name, locale)}
                  </h3>
                  <p>{localizedAccountText(domain.description, locale)}</p>
                </div>
                <Link href={domain.directoryHref}>
                  {linkTitle(
                    labels.openDirectory,
                    localizedAccountText(domain.name, locale),
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section
          className="section section--tinted"
          aria-labelledby="controls-heading"
        >
          <div className="shell">
            <div className={styles.controls}>
              <p className="eyebrow">{labels.controlsEyebrow}</p>
              <h2 id="controls-heading">{labels.controlsHeading}</h2>
              <p>{labels.controlsText}</p>
            </div>
          </div>
        </section>
      </main>
      <PageFooter />
    </>
  );
}
