"use client";

import Link from "next/link";
import { useLocale } from "@/components/LocaleProvider";
import styles from "./DevelopmentSocialIntro.module.css";

const copy = {
  en: {
    eyebrow: "YOUR FILES",
    title: "Follow the work of government—not just the news cycle.",
    intro:
      "Build a private collection of reviewed schemes, projects, public money, procurement, officeholders and election records. Your interests stay on this device.",
    steps: [
      ["Discover", "Browse source-linked public records."],
      ["Follow", "Save records you want to revisit."],
      ["Review activity", "See your own follow and removal history."],
      ["Add context", "Read approved community experiences separately."],
    ],
    explore: "Start exploring",
    watchlist: "Open my files",
  },
  te: {
    eyebrow: "మీ ఫైళ్లు",
    title: "వార్తా చక్రాన్ని మాత్రమే కాకుండా ప్రభుత్వ పనిని అనుసరించండి.",
    intro:
      "సమీక్షించిన పథకాలు, ప్రాజెక్టులు, ప్రజా ధనం, కొనుగోళ్లు, అధికారులు మరియు ఎన్నికల రికార్డుల ప్రైవేట్ ఫైళ్ల సేకరణను రూపొందించండి. మీ ఆసక్తులు ఈ పరికరంలోనే ఉంటాయి.",
    steps: [
      ["కనుగొనండి", "మూలాలతో అనుసంధానించిన ప్రజా రికార్డులను చూడండి."],
      ["అనుసరించండి", "మళ్లీ చూడాలనుకునే రికార్డులను భద్రపరచండి."],
      ["కార్యాచరణను చూడండి", "మీ అనుసరణ మరియు తొలగింపు చరిత్రను చూడండి."],
      ["సందర్భాన్ని చూడండి", "ఆమోదించిన కమ్యూనిటీ అనుభవాలను విడిగా చదవండి."],
    ],
    explore: "అన్వేషించడం ప్రారంభించండి",
    watchlist: "నా ఫైళ్లు తెరవండి",
  },
} as const;

export function DevelopmentSocialIntro() {
  const { locale } = useLocale();
  const labels = locale === "te" ? copy.te : copy.en;
  return (
    <section
      className="section section--tinted"
      aria-labelledby="diary-intro-heading"
    >
      <div className={`shell ${styles.layout}`}>
        <div>
          <p className="eyebrow">{labels.eyebrow}</p>
          <h2 id="diary-intro-heading">{labels.title}</h2>
          <p>{labels.intro}</p>
          <div className={styles.actions}>
            <Link className="button button--primary" href="/explore-data">
              {labels.explore} →
            </Link>
            <Link className="button" href="/lists">
              {labels.watchlist}
            </Link>
          </div>
        </div>
        <ol className={styles.steps}>
          {labels.steps.map(([title, text], index) => (
            <li key={title}>
              <span>{index + 1}</span>
              <div>
                <strong>{title}</strong>
                <p>{text}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
