"use client";

import { useLocale } from "@/components/LocaleProvider";

type LocalText = { en: string; te: string };

const constitutionalBasis = [
  {
    provision: "Article 19(1)(a)",
    title: {
      en: "Freedom of speech and expression",
      te: "వాక్ స్వాతంత్ర్యం మరియు భావ వ్యక్తీకరణ స్వేచ్ఛ",
    },
    explanation: {
      en: "The constitutional foundation for citizens to seek, discuss and publish information about public affairs, subject to lawful restrictions.",
      te: "చట్టబద్ధమైన పరిమితులకు లోబడి ప్రజా వ్యవహారాల గురించి సమాచారం తెలుసుకోవడానికి, చర్చించడానికి మరియు ప్రచురించడానికి పౌరులకు రాజ్యాంగ ఆధారం.",
    },
  },
  {
    provision: "Article 19(2)",
    title: { en: "Reasonable restrictions", te: "సహేతుకమైన పరిమితులు" },
    explanation: {
      en: "Expression is not an unlimited right. Applicable restrictions include defamation, contempt of court, public order, decency, security and other grounds listed in the Constitution.",
      te: "భావ వ్యక్తీకరణ అపరిమిత హక్కు కాదు. పరువు నష్టం, న్యాయస్థాన ధిక్కారం, ప్రజా శాంతి, మర్యాద, భద్రత మరియు రాజ్యాంగంలో పేర్కొన్న ఇతర పరిమితులు వర్తిస్తాయి.",
    },
  },
  {
    provision: "Article 51A(h)",
    title: { en: "Inquiry and reform", te: "విచారణ మరియు సంస్కరణ" },
    explanation: {
      en: "The Fundamental Duties call on citizens to develop scientific temper, humanism and the spirit of inquiry and reform.",
      te: "శాస్త్రీయ దృక్పథం, మానవతావాదం, విచారణ మరియు సంస్కరణ స్ఫూర్తిని పెంపొందించడం పౌరుల ప్రాథమిక విధిగా పేర్కొనబడింది.",
    },
  },
] satisfies Array<{
  provision: string;
  title: LocalText;
  explanation: LocalText;
}>;

const rtiBasis = [
  {
    provision: "Sections 2(f) & 2(j)",
    title: { en: "Information and access", te: "సమాచారం మరియు ప్రాప్యత" },
    explanation: {
      en: "Define information and the right to inspect records, obtain certified material and receive information in specified electronic forms.",
      te: "సమాచారం, రికార్డులను పరిశీలించడం, ధృవీకరించిన ప్రతులను పొందడం మరియు నిర్దిష్ట ఎలక్ట్రానిక్ రూపాల్లో సమాచారం పొందే హక్కును నిర్వచిస్తాయి.",
    },
  },
  {
    provision: "Section 3",
    title: { en: "Right to information", te: "సమాచార హక్కు" },
    explanation: {
      en: "Provides that all citizens have the right to information, subject to the Act.",
      te: "చట్టంలోని నిబంధనలకు లోబడి ప్రతి పౌరుడికి సమాచార హక్కు ఉందని పేర్కొంటుంది.",
    },
  },
  {
    provision: "Section 4",
    title: { en: "Proactive public disclosure", te: "స్వచ్ఛంద ప్రజా వెల్లడి" },
    explanation: {
      en: "Requires public authorities to maintain records and proactively publish specified institutional and decision-making information as widely as practicable.",
      te: "ప్రజా సంస్థలు రికార్డులను నిర్వహించి, నిర్దిష్ట సంస్థాగత మరియు నిర్ణయ సమాచారాన్ని సాధ్యమైనంత విస్తృతంగా స్వచ్ఛందంగా ప్రచురించాలని కోరుతుంది.",
    },
  },
  {
    provision: "Sections 8, 9 & 11",
    title: {
      en: "Limits and third-party safeguards",
      te: "పరిమితులు మరియు మూడవ పక్ష రక్షణలు",
    },
    explanation: {
      en: "Set exemptions, copyright-related refusal rules and procedures for confidential third-party information. Public-record work must respect these limits.",
      te: "మినహాయింపులు, కాపీరైట్‌కు సంబంధించిన నిరాకరణ నియమాలు మరియు గోప్యమైన మూడవ పక్ష సమాచార విధానాలను నిర్దేశిస్తాయి. ప్రజా రికార్డు పని ఈ పరిమితులను గౌరవించాలి.",
    },
  },
] satisfies Array<{
  provision: string;
  title: LocalText;
  explanation: LocalText;
}>;

const legalGuardrails = [
  {
    law: "Digital Personal Data Protection Act, 2023",
    provisions: "Sections 4–8 and 11–13",
    duty: {
      en: "Lawful processing, notice, consent where required, security duties, and data-principal rights. Applicability also depends on commencement notifications and applicable rules.",
      te: "చట్టబద్ధమైన ప్రాసెసింగ్, నోటీసు, అవసరమైన చోట సమ్మతి, భద్రతా బాధ్యతలు మరియు డేటా ప్రిన్సిపల్ హక్కులు. అమలు నోటిఫికేషన్లు మరియు వర్తించే నియమాలపై కూడా వర్తింపు ఆధారపడి ఉంటుంది.",
    },
  },
  {
    law: "Information Technology Act, 2000",
    provisions: "Section 79 and applicable rules",
    duty: {
      en: "Intermediary protection is conditional, not automatic. Future community features require due diligence, grievance handling and lawful takedown processes.",
      te: "మధ్యవర్తి రక్షణ షరతులతో కూడినది; స్వయంచాలకంగా లభించదు. భవిష్యత్ కమ్యూనిటీ ఫీచర్లకు తగిన జాగ్రత్తలు, ఫిర్యాదు పరిష్కారం మరియు చట్టబద్ధ తొలగింపు ప్రక్రియలు అవసరం.",
    },
  },
  {
    law: "Bharatiya Nyaya Sanhita, 2023",
    provisions: "Section 356",
    duty: {
      en: "Defamation law applies. The platform reports sourced facts and carefully labelled anomalies; it does not turn an inconsistency into an unsupported criminal allegation.",
      te: "పరువు నష్టం చట్టం వర్తిస్తుంది. వేదిక మూలాధారాలతో కూడిన వాస్తవాలు, స్పష్టంగా గుర్తించిన అసంగతతలను మాత్రమే చూపుతుంది; ఆధారం లేని నేర ఆరోపణగా మార్చదు.",
    },
  },
  {
    law: "Copyright Act, 1957",
    provisions: "Section 52 and other applicable provisions",
    duty: {
      en: "Fair-dealing and other exceptions are limited and purpose-specific. Publication by a government body does not create a blanket waiver of copyright.",
      te: "న్యాయసమ్మత వినియోగం మరియు ఇతర మినహాయింపులు పరిమితమైనవి, నిర్దిష్ట ప్రయోజనాలకు మాత్రమే వర్తిస్తాయి. ప్రభుత్వ సంస్థ ప్రచురణ కాపీరైట్‌కు సంపూర్ణ మినహాయింపు కాదు.",
    },
  },
  {
    law: "Representation of the People Act, 1951",
    provisions: "Section 126A",
    duty: {
      en: "Exit-poll publication is specially regulated. This platform does not conduct election exit polls.",
      te: "ఎగ్జిట్ పోల్స్ ప్రచురణకు ప్రత్యేక నియంత్రణలు ఉన్నాయి. ఈ వేదిక ఎన్నికల ఎగ్జిట్ పోల్స్ నిర్వహించదు.",
    },
  },
] satisfies Array<{ law: string; provisions: string; duty: LocalText }>;

const practices = [
  {
    en: "Every official claim must link to a source record and disclose review status.",
    te: "ప్రతి అధికారిక వాదన మూల రికార్డుకు అనుసంధానమై, సమీక్ష స్థితిని వెల్లడించాలి.",
  },
  {
    en: "Official, calculated, inferred and community-reported information remain visibly separate.",
    te: "అధికారిక, లెక్కించిన, ఊహించిన మరియు కమ్యూనిటీ నివేదించిన సమాచారం స్పష్టంగా వేరుగా ఉంటుంది.",
  },
  {
    en: "Historical official values are retained rather than silently overwritten.",
    te: "చారిత్రక అధికారిక విలువలను నిశ్శబ్దంగా మార్చకుండా భద్రపరుస్తాము.",
  },
  {
    en: "Precise citizen locations and private evidence are not exposed publicly.",
    te: "పౌరుల ఖచ్చితమైన స్థానాలు మరియు వ్యక్తిగత ఆధారాలను బహిరంగంగా చూపించము.",
  },
  {
    en: "Open platform polls are labelled as results among participating users, not as representative public opinion.",
    te: "ఓపెన్ ప్లాట్‌ఫామ్ పోల్స్‌ను పాల్గొన్న వినియోగదారుల ఫలితాలుగా మాత్రమే చూపిస్తాము; ప్రజాభిప్రాయానికి ప్రాతినిధ్యంగా కాదు.",
  },
] satisfies LocalText[];

const officialSources = [
  {
    label: "Constitution of India — Legislative Department",
    href: "https://legislative.gov.in/constitution-of-india/",
  },
  {
    label: "Right to Information Act, 2005 — India Code",
    href: "https://www.indiacode.nic.in/handle/123456789/2065",
  },
  {
    label: "Information Technology Act, 2000 — India Code",
    href: "https://www.indiacode.nic.in/handle/123456789/1999",
  },
  {
    label: "Bharatiya Nyaya Sanhita, 2023 — India Code",
    href: "https://www.indiacode.nic.in/handle/123456789/20062",
  },
  {
    label: "Central Acts directory — Legislative Department",
    href: "https://legislative.gov.in/document-category/list-of-central-acts/",
  },
];

function local(text: LocalText, locale: string) {
  return (
    (text as Record<string, string>)[locale] ||
    (locale === "te" ? text.te : text.en)
  );
}

export function LegalBasisContent() {
  const { locale } = useLocale();
  const isTelugu = locale === "te";

  return (
    <>
      <header className="page-intro shell legal-intro">
        <p className="eyebrow">
          {isTelugu
            ? "చట్టపరమైన & రాజ్యాంగ ఆధారం"
            : "LEGAL & CONSTITUTIONAL BASIS"}
        </p>
        <h1>
          {isTelugu
            ? "ప్రజా రికార్డులను పరిశీలించడం ప్రజాస్వామ్య హక్కు—బాధ్యత కూడా."
            : "Inspecting the public record is a democratic right—and a responsibility."}
        </h1>
        <p className="lede">
          {isTelugu
            ? "Viksit Bharat?? స్వతంత్ర పౌర వేదిక. ఇది ప్రభుత్వ రికార్డులను కనుగొనడం, మూలాధారాలతో చూపడం, ప్రజలు పరిశీలించడంలో సహాయపడేలా భారత చట్టాల పరిధిలో పనిచేయడానికి రూపొందించబడింది."
            : "Viksit Bharat?? is an independent civic platform designed to operate within Indian law while helping people find, source and inspect government records."}
        </p>
        <aside className="legal-disclaimer" aria-label="Legal disclaimer">
          <strong>{isTelugu ? "ముఖ్య గమనిక" : "Important"}</strong>
          <p>
            {isTelugu
              ? "ఈ పేజీ వేదిక రూపకల్పనకు సంబంధించిన సాధారణ సమాచార సారాంశం మాత్రమే. ఇది న్యాయ సలహా కాదు, చట్టానికి మినహాయింపును ఇవ్వదు, ఏ ప్రత్యేక ప్రచురణ చట్టబద్ధమని హామీ ఇవ్వదు."
              : "This page is a general product-policy summary. It is not legal advice, does not create immunity from law, and does not guarantee that any particular publication is lawful."}
          </p>
        </aside>
      </header>

      <section
        className="section shell"
        aria-labelledby="constitutional-heading"
      >
        <div className="section-heading">
          <p className="eyebrow">
            {isTelugu ? "రాజ్యాంగం" : "THE CONSTITUTION"}
          </p>
          <h2 id="constitutional-heading">
            {isTelugu
              ? "హక్కులు—వాటి పరిమితులతో సహా"
              : "Rights—with their limits"}
          </h2>
        </div>
        <div className="legal-reference-list">
          {constitutionalBasis.map((item) => (
            <article key={item.provision}>
              <p className="legal-provision">{item.provision}</p>
              <h3>{local(item.title, locale)}</h3>
              <p>{local(item.explanation, locale)}</p>
            </article>
          ))}
        </div>
      </section>

      <section
        className="section section--tinted"
        aria-labelledby="rti-heading"
      >
        <div className="shell">
          <div className="section-heading">
            <p className="eyebrow">RIGHT TO INFORMATION ACT, 2005</p>
            <h2 id="rti-heading">
              {isTelugu
                ? "ప్రజా సమాచారానికి చట్టబద్ధమైన ప్రాప్యత"
                : "Statutory access to public information"}
            </h2>
          </div>
          <div className="legal-reference-list legal-reference-list--two">
            {rtiBasis.map((item) => (
              <article key={item.provision}>
                <p className="legal-provision">{item.provision}</p>
                <h3>{local(item.title, locale)}</h3>
                <p>{local(item.explanation, locale)}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section shell" aria-labelledby="guardrails-heading">
        <div className="section-heading">
          <p className="eyebrow">
            {isTelugu ? "చట్టపరమైన రక్షణలు" : "LEGAL GUARDRAILS"}
          </p>
          <h2 id="guardrails-heading">
            {isTelugu
              ? "పారదర్శకత ఇతర బాధ్యతలను తొలగించదు"
              : "Transparency does not cancel other duties"}
          </h2>
        </div>
        <div className="responsive-table legal-table">
          <table>
            <thead>
              <tr>
                <th scope="col">{isTelugu ? "చట్టం" : "Law"}</th>
                <th scope="col">
                  {isTelugu ? "సంబంధిత నిబంధనలు" : "Relevant provisions"}
                </th>
                <th scope="col">
                  {isTelugu ? "వేదిక బాధ్యత" : "Platform responsibility"}
                </th>
              </tr>
            </thead>
            <tbody>
              {legalGuardrails.map((item) => (
                <tr key={item.law}>
                  <th scope="row">{item.law}</th>
                  <td data-label={isTelugu ? "నిబంధనలు" : "Provisions"}>
                    {item.provisions}
                  </td>
                  <td data-label={isTelugu ? "బాధ్యత" : "Responsibility"}>
                    {local(item.duty, locale)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section
        className="section section--tinted"
        aria-labelledby="practice-heading"
      >
        <div className="shell legal-two-column">
          <div className="section-heading">
            <p className="eyebrow">{isTelugu ? "ఆచరణలో" : "IN PRACTICE"}</p>
            <h2 id="practice-heading">
              {isTelugu
                ? "ఈ సూత్రాలు ఉత్పత్తిని ఎలా నియంత్రిస్తాయి"
                : "How these principles govern the product"}
            </h2>
          </div>
          <ul className="legal-practice-list">
            {practices.map((practice) => (
              <li key={practice.en}>{local(practice, locale)}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section shell" aria-labelledby="sources-heading">
        <div className="section-heading">
          <p className="eyebrow">
            {isTelugu ? "అధికారిక పాఠాలు" : "OFFICIAL TEXTS"}
          </p>
          <h2 id="sources-heading">
            {isTelugu ? "అసలు చట్టాలను చదవండి" : "Read the law at its source"}
          </h2>
          <p>
            {isTelugu
              ? "చట్టం మారవచ్చు. దిగువ అధికారిక ప్రచురణలను పరిశీలించండి మరియు అవసరమైనప్పుడు భారతీయ న్యాయ సలహా పొందండి."
              : "Law can change. Consult the official publications below and obtain qualified Indian legal advice where needed."}
          </p>
        </div>
        <ul className="official-legal-links">
          {officialSources.map((source) => (
            <li key={source.href}>
              <a href={source.href}>{source.label}</a>
              <span aria-hidden="true">↗</span>
            </li>
          ))}
        </ul>
        <p className="legal-source-note">
          {isTelugu
            ? "చట్టపరమైన విషయాల చివరి సమీక్ష: 14 ఆగస్టు 2026"
            : "Legal content last reviewed: 14 August 2026"}
        </p>
      </section>
    </>
  );
}
