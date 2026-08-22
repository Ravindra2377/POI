"use client";

import Link from "next/link";
import { useLocale } from "@/components/LocaleProvider";
import styles from "./professional.module.css";

const copy = {
  en: {
    eyebrow: "PROFESSIONAL SERVICES · PILOT",
    title:
      "Public records stay free. Professional research funds the public utility.",
    intro:
      "We are preparing source-linked research services for newsrooms, researchers, nonprofits and public-interest teams. The pilot is manually scoped so coverage and limitations are agreed before any payment.",
    boundaryTitle: "No public-data paywall",
    boundaryText:
      "The public website, source links and essential civic records remain free. Organisations pay for research time, structured delivery, support and repeatable workflows—not privileged facts or editorial influence.",
    audienceEyebrow: "WHO IT IS FOR",
    audienceTitle: "Teams that need evidence, not another dashboard",
    audiences: [
      {
        title: "Newsrooms",
        text: "Source packs, constituency briefings and reproducible background research.",
      },
      {
        title: "Researchers and nonprofits",
        text: "Documented extracts, coverage notes and comparable district or scheme views.",
      },
      {
        title: "CSR and public-interest teams",
        text: "Scoped geographic research using published records with limitations shown.",
      },
    ],
    offerEyebrow: "FIRST PAID OFFERS",
    offerTitle: "Start with a scoped pilot",
    offers: [
      {
        title: "Professional pilot",
        price: "₹999 / month",
        label: "Indicative pilot price",
        features: [
          "Manual onboarding and one saved research brief",
          "Source-linked exports where reviewed data is available",
          "Coverage and data-quality notes",
          "Monthly pilot review",
        ],
      },
      {
        title: "Organisation pilot",
        price: "₹3,999 / month",
        label: "Scoped before activation",
        features: [
          "Shared district, scheme or public-money research brief",
          "Structured export or API feasibility assessment",
          "Priority correction and provenance review channel",
          "Agreed deliverables and coverage boundary",
        ],
      },
      {
        title: "Custom research",
        price: "Quoted after review",
        label: "Project-based",
        features: [
          "District or constituency evidence pack",
          "Scheme, budget or procurement research",
          "Training for research and newsroom teams",
          "No claim of coverage before source review",
        ],
      },
    ],
    availability:
      "These are pilot offers, not self-service subscriptions. Payment, scope and delivery dates are confirmed only after a written coverage review.",
    trustEyebrow: "COMMERCIAL INDEPENDENCE",
    trustTitle: "Payment cannot change the record",
    commitments: [
      "No sale of citizen identities, activity or precise location.",
      "No paid removal, favourable ranking or unlabelled sponsored content.",
      "Every official claim continues to cite its source record.",
      "Client-funded research is labelled and cannot control public corrections or moderation.",
    ],
    contactEyebrow: "PROFESSIONAL ACCOUNT",
    contactTitle: "Create an account before payment",
    contactText:
      "Register with a verified work email. Your requested plan remains inactive until an administrator reviews the account; no payment is collected during this account-foundation stage.",
    contactButton: "Create or sign in to a professional account",
  },
  te: {
    eyebrow: "వృత్తిపరమైన సేవలు · పైలట్",
    title:
      "ప్రజా రికార్డులు ఉచితంగానే ఉంటాయి. వృత్తిపరమైన పరిశోధన ప్రజా వేదికకు మద్దతు ఇస్తుంది.",
    intro:
      "వార్తా సంస్థలు, పరిశోధకులు, లాభాపేక్షలేని సంస్థలు మరియు ప్రజా ప్రయోజన బృందాల కోసం మూలాలతో అనుసంధానించిన పరిశోధన సేవలను సిద్ధం చేస్తున్నాము. చెల్లింపుకు ముందు కవరేజ్ మరియు పరిమితులను అంగీకరించేలా పైలట్‌ను చేతితో నిర్వచిస్తాము.",
    boundaryTitle: "ప్రజా డేటాకు పేవాల్ లేదు",
    boundaryText:
      "ప్రజా వెబ్‌సైట్, మూలాల లింకులు మరియు అవసరమైన పౌర రికార్డులు ఉచితంగానే ఉంటాయి. సంస్థలు పరిశోధన సమయం, నిర్మిత డెలివరీ, సహాయం మరియు పునరావృత పనివిధానాలకు చెల్లిస్తాయి—ప్రత్యేక వాస్తవాలు లేదా సంపాదకీయ ప్రభావానికి కాదు.",
    audienceEyebrow: "ఎవరి కోసం",
    audienceTitle: "మరో డ్యాష్‌బోర్డు కాకుండా ఆధారాలు అవసరమైన బృందాలు",
    audiences: [
      {
        title: "వార్తా సంస్థలు",
        text: "మూలాల ప్యాక్‌లు, నియోజకవర్గ వివరాలు మరియు పునరుత్పాదక నేపథ్య పరిశోధన.",
      },
      {
        title: "పరిశోధకులు మరియు లాభాపేక్షలేని సంస్థలు",
        text: "పత్రబద్ధమైన డేటా, కవరేజ్ గమనికలు మరియు పోల్చదగిన జిల్లా లేదా పథక వీక్షణలు.",
      },
      {
        title: "CSR మరియు ప్రజా ప్రయోజన బృందాలు",
        text: "పరిమితులు చూపించే ప్రచురిత రికార్డులతో నిర్వచించిన భౌగోళిక పరిశోధన.",
      },
    ],
    offerEyebrow: "మొదటి చెల్లింపు సేవలు",
    offerTitle: "నిర్వచించిన పైలట్‌తో ప్రారంభించండి",
    offers: [
      {
        title: "వృత్తిపరమైన పైలట్",
        price: "నెలకు ₹999",
        label: "సూచనాత్మక పైలట్ ధర",
        features: [
          "చేతితో ప్రారంభ సహాయం మరియు ఒక భద్రపరచిన పరిశోధన వివరణ",
          "సమీక్షించిన డేటా ఉన్నచోట మూలాలతో అనుసంధానించిన ఎగుమతులు",
          "కవరేజ్ మరియు డేటా నాణ్యత గమనికలు",
          "నెలవారీ పైలట్ సమీక్ష",
        ],
      },
      {
        title: "సంస్థ పైలట్",
        price: "నెలకు ₹3,999",
        label: "ప్రారంభానికి ముందు పరిధి నిర్ణయం",
        features: [
          "పంచుకోగల జిల్లా, పథకం లేదా ప్రజా ధన పరిశోధన వివరణ",
          "నిర్మిత ఎగుమతి లేదా API సాధ్యత అంచనా",
          "దిద్దుబాటు మరియు మూలాధార సమీక్షకు ప్రాధాన్య మార్గం",
          "అంగీకరించిన ఫలితాలు మరియు కవరేజ్ హద్దు",
        ],
      },
      {
        title: "ప్రత్యేక పరిశోధన",
        price: "సమీక్ష తర్వాత ధర",
        label: "ప్రాజెక్ట్ ఆధారితం",
        features: [
          "జిల్లా లేదా నియోజకవర్గ ఆధారాల ప్యాక్",
          "పథకం, బడ్జెట్ లేదా కొనుగోలు పరిశోధన",
          "పరిశోధన మరియు వార్తా బృందాలకు శిక్షణ",
          "మూలాల సమీక్షకు ముందు కవరేజ్ హామీ లేదు",
        ],
      },
    ],
    availability:
      "ఇవి పైలట్ సేవలు మాత్రమే, స్వయంచాలక సభ్యత్వాలు కావు. లిఖితపూర్వక కవరేజ్ సమీక్ష తర్వాత మాత్రమే చెల్లింపు, పరిధి మరియు డెలివరీ తేదీలు నిర్ధారించబడతాయి.",
    trustEyebrow: "వాణిజ్య స్వతంత్రత",
    trustTitle: "చెల్లింపు రికార్డును మార్చలేదు",
    commitments: [
      "పౌరుల గుర్తింపు, కార్యకలాపం లేదా ఖచ్చితమైన స్థానాన్ని అమ్మము.",
      "చెల్లింపుతో తొలగింపు, అనుకూల ర్యాంకింగ్ లేదా లేబుల్ లేని ప్రాయోజిత కంటెంట్ ఉండదు.",
      "ప్రతి అధికారిక ప్రకటన దాని మూల రికార్డును సూచిస్తూనే ఉంటుంది.",
      "క్లయింట్ నిధులతో చేసిన పరిశోధనకు లేబుల్ ఉంటుంది; ప్రజా దిద్దుబాట్లు లేదా మోడరేషన్‌పై నియంత్రణ ఉండదు.",
    ],
    contactEyebrow: "వృత్తిపరమైన ఖాతా",
    contactTitle: "చెల్లింపుకు ముందు ఖాతాను సృష్టించండి",
    contactText:
      "ధృవీకరించిన కార్యాలయ ఇమెయిల్‌తో నమోదు చేసుకోండి. నిర్వాహకుడు ఖాతాను సమీక్షించే వరకు అభ్యర్థించిన ప్లాన్ క్రియాశీలం కాదు; ఈ ఖాతా పునాది దశలో చెల్లింపు వసూలు చేయబడదు.",
    contactButton: "వృత్తిపరమైన ఖాతాను సృష్టించండి లేదా సైన్ ఇన్ చేయండి",
  },
} as const;

export function ProfessionalOffering() {
  const { locale } = useLocale();
  const labels = locale === "te" ? copy.te : copy.en;

  return (
    <>
      <header className="page-intro shell">
        <p className="eyebrow">{labels.eyebrow}</p>
        <h1>{labels.title}</h1>
        <p className="lede">{labels.intro}</p>
        <aside className={styles.boundary} aria-label={labels.boundaryTitle}>
          <strong>{labels.boundaryTitle}</strong>
          <p>{labels.boundaryText}</p>
        </aside>
      </header>

      <section className="section shell" aria-labelledby="audience-heading">
        <div className="section-heading">
          <p className="eyebrow">{labels.audienceEyebrow}</p>
          <h2 id="audience-heading">{labels.audienceTitle}</h2>
        </div>
        <ul className={styles.audienceGrid}>
          {labels.audiences.map((audience) => (
            <li key={audience.title}>
              <h3>{audience.title}</h3>
              <p>{audience.text}</p>
            </li>
          ))}
        </ul>
      </section>

      <section
        className="section section--tinted"
        aria-labelledby="offers-heading"
      >
        <div className="shell">
          <div className="section-heading section-heading--split">
            <div>
              <p className="eyebrow">{labels.offerEyebrow}</p>
              <h2 id="offers-heading">{labels.offerTitle}</h2>
            </div>
            <p>{labels.availability}</p>
          </div>
          <ul className={styles.offerGrid}>
            {labels.offers.map((offer) => (
              <li key={offer.title}>
                <span>{offer.label}</span>
                <h3>{offer.title}</h3>
                <strong>{offer.price}</strong>
                <ul>
                  {offer.features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section shell" aria-labelledby="trust-heading">
        <div className={styles.trustLayout}>
          <div>
            <p className="eyebrow">{labels.trustEyebrow}</p>
            <h2 id="trust-heading">{labels.trustTitle}</h2>
          </div>
          <ul>
            {labels.commitments.map((commitment) => (
              <li key={commitment}>{commitment}</li>
            ))}
          </ul>
        </div>
      </section>

      <section
        className={`section section--tinted ${styles.contact}`}
        aria-labelledby="contact-heading"
      >
        <div className="shell">
          <p className="eyebrow">{labels.contactEyebrow}</p>
          <h2 id="contact-heading">{labels.contactTitle}</h2>
          <p>{labels.contactText}</p>
          <Link className="button button--primary" href="/professional/account">
            {labels.contactButton}
          </Link>
        </div>
      </section>
    </>
  );
}
