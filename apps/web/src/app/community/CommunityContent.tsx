"use client";

import Link from "next/link";
import { useLocale } from "@/components/LocaleProvider";
import { PageFooter } from "@/components/PageFooter";
import { SiteHeader } from "@/components/SiteHeader";
import {
  localizedCommunityText,
  participationModes,
  pollDisclosures,
  readinessGates,
} from "@/lib/community";
import styles from "./community.module.css";

const copy = {
  en: {
    eyebrow: "COMMUNITY RECORD",
    title: "Public experience, clearly separate from official fact.",
    intro:
      "Future structured reports and transparent polls will be attached to specific projects, schemes, services and places—not an endless political feed.",
    notice: "Community participation is not yet open",
    noticeText:
      "Identity, consent, private evidence, moderation, appeals and abuse controls must be implemented before public submissions. This page collects nothing about you.",
    participationEyebrow: "PARTICIPATION · PLANNED",
    participationHeading: "Participation modes are planned, not open",
    participationNote:
      "Nothing can be submitted today. These are the participation modes that would open once consent, identity and moderation controls are built.",
    pending: "Planned",
    pollEyebrow: "POLLS",
    pollHeading: "No poll result here represents India or Andhra Pradesh",
    pollText:
      "Polls are not open. When they open, every poll will carry these disclosures and never be described as representative of Andhra Pradesh.",
    disclosuresHeading: "Disclosures every poll must carry",
    readinessEyebrow: "READINESS",
    readinessHeading: "What must exist before participation opens",
    readinessNote:
      "Participation stays closed until identity, consent, private evidence, moderation, appeals, abuse and audit controls exist. Every future moderation action will produce an immutable audit record.",
    charterEyebrow: "CHARTER",
    charterHeading: "The rules of participation, written before it opens",
    charterNote:
      "The community charter defines the evidence classes, labeling and what is never allowed. It is a commitment, not an open door.",
    charterLink: "Read the community charter",
  },
  te: {
    eyebrow: "కమ్యూనిటీ రికార్డు",
    title: "అధికారిక వాస్తవం నుండి స్పష్టంగా వేరు చేయబడిన ప్రజా అనుభవం.",
    intro:
      "భవిష్యత్ నిర్మాణాత్మక నివేదికలు మరియు పారదర్శక ఓట్లు నిర్దిష్ట ప్రాజెక్టులు, పథకాలు, సేవలు మరియు ప్రదేశాలకు అనుబంధించబడతాయి—అంతులేని రాజకీయ ఫీడ్ కాదు.",
    notice: "కమ్యూనిటీ భాగస్వామ్యం ఇంకా తెరవబడలేదు",
    noticeText:
      "ప్రజా సమర్పణలకు ముందు గుర్తింపు, సమ్మతి, ప్రైవేట్ సాక్ష్యం, మోడరేషన్, అప్పీళ్లు మరియు దుర్వినియోగ నియంత్రణలు అమలు చేయాలి. ఈ పేజీ మీ గురించి ఏమీ సేకరించదు.",
    participationEyebrow: "భాగస్వామ్యం · ప్రణాళిక",
    participationHeading: "భాగస్వామ్య మార్గాలు ప్రణాళికలో ఉన్నాయి, తెరవబడలేదు",
    participationNote:
      "ఈరోజు ఏమీ సమర్పించబడదు. సమ్మతి, గుర్తింపు మరియు మోడరేషన్ నియంత్రణలు నిర్మించిన తర్వాత తెరవబడే భాగస్వామ్య మార్గాలు ఇవి.",
    pending: "ప్రణాళిక",
    pollEyebrow: "ఓట్లు",
    pollHeading:
      "ఇక్కడి ఏ ఓటు ఫలితం కూడా భారతదేశానికి లేదా ఆంధ్రప్రదేశ్కు ప్రాతినిధ్యం వహించదు",
    pollText:
      "ఓట్లు తెరవబడలేదు. అవి తెరవబడినప్పుడు, ప్రతి ఓటు ఈ వెల్లడులను కలిగి ఉంటుంది మరియు ఆంధ్రప్రదేశ్కు ప్రాతినిధ్యం వహిస్తున్నట్లు ఎప్పుడూ వర్ణించబడదు.",
    disclosuresHeading: "ప్రతి ఓటు తప్పక కలిగి ఉండే వెల్లడులు",
    readinessEyebrow: "సంసిద్ధత",
    readinessHeading: "భాగస్వామ్యం తెరవడానికి ముందు ఏమి ఉండాలి",
    readinessNote:
      "గుర్తింపు, సమ్మతి, ప్రైవేట్ సాక్ష్యం, మోడరేషన్, అప్పీళ్లు, దుర్వినియోగం మరియు ఆడిట్ నియంత్రణలు ఉన్నంత వరకు భాగస్వామ్యం మూసి ఉంటుంది. ప్రతి భవిష్యత్ మోడరేషన్ చర్య మార్పుచెందని ఆడిట్ రికార్డును ఉత్పత్తి చేస్తుంది.",
    charterEyebrow: "చార్టర్",
    charterHeading: "తెరవడానికి ముందు వ్రాసిన భాగస్వామ్య నియమాలు",
    charterNote:
      "కమ్యూనిటీ చార్టర్ సాక్ష్య తరగతులు, లేబులింగ్ మరియు ఎప్పుడూ అనుమతించబడనిది ఏమిటో నిర్వచిస్తుంది. ఇది ఒక నిబద్ధత, తెరిచిన తలుపు కాదు.",
    charterLink: "కమ్యూనిటీ చార్టర్ చదవండి",
  },
} as const;

export function CommunityContent() {
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

        <section
          className="section shell"
          aria-labelledby="participation-heading"
        >
          <div className="section-heading section-heading--split">
            <div>
              <p className="eyebrow">{labels.participationEyebrow}</p>
              <h2 id="participation-heading">{labels.participationHeading}</h2>
            </div>
            <p>{labels.participationNote}</p>
          </div>
          <ul className={styles.participationGrid}>
            {participationModes.map((mode) => (
              <li key={mode.key} className={styles.panel}>
                <span className="status-label" data-state="pending">
                  {labels.pending}
                </span>
                <h3 lang={locale}>
                  {localizedCommunityText(mode.title, locale)}
                </h3>
                <p>{localizedCommunityText(mode.description, locale)}</p>
              </li>
            ))}
          </ul>
        </section>

        <section
          className="section section--tinted"
          aria-labelledby="poll-heading"
        >
          <div className="shell">
            <div className={styles.pollNotice}>
              <p className="eyebrow">{labels.pollEyebrow}</p>
              <h2 id="poll-heading">{labels.pollHeading}</h2>
              <p>{labels.pollText}</p>
              <h3 className={styles.disclosuresHeading}>
                {labels.disclosuresHeading}
              </h3>
              <ul className={styles.disclosureList}>
                {pollDisclosures.map((disclosure) => (
                  <li key={disclosure.key} className={styles.disclosureItem}>
                    <span className="status-label" data-state="pending">
                      {labels.pending}
                    </span>
                    <h4 lang={locale}>
                      {localizedCommunityText(disclosure.title, locale)}
                    </h4>
                    <p>
                      {localizedCommunityText(disclosure.description, locale)}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="section shell" aria-labelledby="readiness-heading">
          <div className="section-heading section-heading--split">
            <div>
              <p className="eyebrow">{labels.readinessEyebrow}</p>
              <h2 id="readiness-heading">{labels.readinessHeading}</h2>
            </div>
            <p>{labels.readinessNote}</p>
          </div>
          <ul className={styles.readinessGrid}>
            {readinessGates.map((gate) => (
              <li key={gate.key} className={styles.panel}>
                <span className="status-label" data-state="pending">
                  {labels.pending}
                </span>
                <h3 lang={locale}>
                  {localizedCommunityText(gate.title, locale)}
                </h3>
                <p>{localizedCommunityText(gate.description, locale)}</p>
              </li>
            ))}
          </ul>
        </section>

        <section
          className="section section--tinted"
          aria-labelledby="charter-heading"
        >
          <div className="shell">
            <div className={styles.charter}>
              <p className="eyebrow">{labels.charterEyebrow}</p>
              <h2 id="charter-heading">{labels.charterHeading}</h2>
              <p>{labels.charterNote}</p>
              <Link href="/community/charter">{labels.charterLink}</Link>
            </div>
          </div>
        </section>
      </main>
      <PageFooter />
    </>
  );
}
