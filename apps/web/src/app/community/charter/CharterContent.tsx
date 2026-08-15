"use client";

import Link from "next/link";
import { useLocale } from "@/components/LocaleProvider";
import { PageFooter } from "@/components/PageFooter";
import { SiteHeader } from "@/components/SiteHeader";
import {
  charterRules,
  evidenceClasses,
  localizedCommunityText,
} from "@/lib/community";
import styles from "./charter.module.css";

const copy = {
  en: {
    eyebrow: "COMMUNITY CHARTER",
    title: "The rules of participation, written before it opens.",
    intro:
      "This charter is a commitment, not an open door. Participation stays closed until every control it promises is built and audited.",
    notice: "Participation is still closed",
    noticeText:
      "Nothing here is a submission form. The charter describes what the community would be governed by when identity, consent, moderation, appeals, abuse and audit controls exist.",
    evidenceEyebrow: "EVIDENCE CLASSES",
    evidenceHeading: "Community evidence never becomes official fact.",
    evidenceNote:
      "Every value on the platform is marked official, calculated, inferred, or community-reported. Community experience is always labeled and never silently presented as official.",
    rulesEyebrow: "RULES",
    rulesHeading: "What is never allowed",
    rulesNote:
      "These rules would be enforced by moderation and backed by an immutable audit record of every action. They are commitments, not yet enforceable.",
    pending: "Planned",
    opennessEyebrow: "READINESS",
    opennessHeading: "Read the community participation status",
    opennessNote:
      "The community page shows what must exist before participation opens.",
    opennessLink: "Community participation status",
  },
  te: {
    eyebrow: "కమ్యూనిటీ చార్టర్",
    title: "తెరవడానికి ముందు వ్రాసిన భాగస్వామ్య నియమాలు.",
    intro:
      "ఈ చార్టర్ ఒక నిబద్ధత, తెరిచిన తలుపు కాదు. అది వాగ్దానం చేసే ప్రతి నియంత్రణ నిర్మించబడి ఆడిట్ చేయబడే వరకు భాగస్వామ్యం మూసి ఉంటుంది.",
    notice: "భాగస్వామ్యం ఇంకా మూసి ఉంది",
    noticeText:
      "ఇక్కడ ఏదీ సమర్పణ ఫారం కాదు. గుర్తింపు, సమ్మతి, మోడరేషన్, అప్పీళ్లు, దుర్వినియోగం మరియు ఆడిట్ నియంత్రణలు ఉన్నప్పుడు సమాజం దేనితో పరిపాలించబడుతుందో చార్టర్ వివరిస్తుంది.",
    evidenceEyebrow: "సాక్ష్య తరగతులు",
    evidenceHeading: "సమాజ సాక్ష్యం ఎప్పుడూ అధికారిక వాస్తవం కాదు.",
    evidenceNote:
      "వేదికపై ప్రతి విలువ అధికారిక, గణించబడినది, ఊహించబడినది లేదా సమాజ-నివేదితగా గుర్తించబడుతుంది. సమాజ అనుభవం ఎల్లప్పుడూ లేబుల్ చేయబడుతుంది మరియు అధికారికంగా నిశ్శబ్దంగా ప్రదర్శించబడదు.",
    rulesEyebrow: "నియమాలు",
    rulesHeading: "ఎప్పుడూ అనుమతించబడనిది",
    rulesNote:
      "ఈ నియమాలు మోడరేషన్ ద్వారా అమలు చేయబడతాయి మరియు ప్రతి చర్య యొక్క మార్పుచెందని ఆడిట్ రికార్డుతో బ్యాకప్ చేయబడతాయి. అవి నిబద్ధతలు, ఇంకా అమలు చేయదగినవి కావు.",
    pending: "ప్రణాళిక",
    opennessEyebrow: "సంసిద్ధత",
    opennessHeading: "కమ్యూనిటీ భాగస్వామ్య స్థితి చదవండి",
    opennessNote:
      "భాగస్వామ్యం తెరవడానికి ముందు ఏమి ఉండాలో కమ్యూనిటీ పేజీ చూపుతుంది.",
    opennessLink: "కమ్యూనిటీ భాగస్వామ్య స్థితి",
  },
} as const;

export function CharterContent() {
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
          <aside className={styles.notice} aria-label={labels.notice}>
            <strong>{labels.notice}</strong>
            <p>{labels.noticeText}</p>
          </aside>
        </header>

        <section className="section shell" aria-labelledby="evidence-heading">
          <div className="section-heading section-heading--split">
            <div>
              <p className="eyebrow">{labels.evidenceEyebrow}</p>
              <h2 id="evidence-heading">{labels.evidenceHeading}</h2>
            </div>
            <p>{labels.evidenceNote}</p>
          </div>
          <ul className={styles.classGrid}>
            {evidenceClasses.map((evidenceClass) => (
              <li key={evidenceClass.key} className={styles.card}>
                <span
                  className="classification-mark"
                  data-kind={evidenceClass.kind}
                  aria-hidden="true"
                />
                <h3 lang={locale}>
                  {localizedCommunityText(evidenceClass.title, locale)}
                </h3>
                <p>
                  {localizedCommunityText(evidenceClass.description, locale)}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section className="section shell" aria-labelledby="rules-heading">
          <div className="section-heading section-heading--split">
            <div>
              <p className="eyebrow">{labels.rulesEyebrow}</p>
              <h2 id="rules-heading">{labels.rulesHeading}</h2>
            </div>
            <p>{labels.rulesNote}</p>
          </div>
          <ul className={styles.ruleGrid}>
            {charterRules.map((rule) => (
              <li key={rule.key} className={styles.card}>
                <span className="status-label" data-state="pending">
                  {labels.pending}
                </span>
                <h3 lang={locale}>
                  {localizedCommunityText(rule.title, locale)}
                </h3>
                <p>{localizedCommunityText(rule.description, locale)}</p>
              </li>
            ))}
          </ul>
        </section>

        <section
          className="section section--tinted"
          aria-labelledby="openness-heading"
        >
          <div className="shell">
            <div className={styles.openness}>
              <p className="eyebrow">{labels.opennessEyebrow}</p>
              <h2 id="openness-heading">{labels.opennessHeading}</h2>
              <p>{labels.opennessNote}</p>
              <Link href="/community">{labels.opennessLink}</Link>
            </div>
          </div>
        </section>
      </main>
      <PageFooter />
    </>
  );
}
