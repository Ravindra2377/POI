import type { Locale } from "./catalog-types";

export interface CommunityLocalizedText {
  en: string;
  te: string;
}

export interface ParticipationMode {
  key: "evidence-comments" | "transparent-polls";
  title: CommunityLocalizedText;
  description: CommunityLocalizedText;
  planned: true;
}

export interface ReadinessGate {
  key:
    | "identity"
    | "consent"
    | "private-evidence"
    | "moderation"
    | "appeals"
    | "abuse"
    | "audit";
  title: CommunityLocalizedText;
  description: CommunityLocalizedText;
  planned: true;
}

export interface PollDisclosure {
  key: "never-representative" | "method" | "no-identity" | "attached";
  title: CommunityLocalizedText;
  description: CommunityLocalizedText;
  planned: true;
}

export interface EvidenceClass {
  key: "official" | "calculated" | "inferred" | "community-reported";
  kind: "official" | "calculated" | "inferred" | "community";
  title: CommunityLocalizedText;
  description: CommunityLocalizedText;
}

export interface CharterRule {
  key:
    | "no-impersonation"
    | "no-anonymous-abuse"
    | "no-precise-locations"
    | "label-everything";
  title: CommunityLocalizedText;
  description: CommunityLocalizedText;
  planned: true;
}

// The participation modes that would open once consent, identity and
// moderation controls are built. Nothing can be submitted today.
export const participationModes: readonly ParticipationMode[] = [
  {
    key: "evidence-comments",
    title: { en: "Evidence and comments", te: "సాక్ష్యం మరియు వ్యాఖ్యలు" },
    description: {
      en: "Structured community evidence attached to specific records, with consent, review and appeal controls.",
      te: "నిర్దిష్ట రికార్డులకు అనుబంధించిన నిర్మాణాత్మక సమాజ సాక్ష్యం, సమ్మతి, సమీక్ష మరియు అప్పీల్ నియంత్రణలతో.",
    },
    planned: true,
  },
  {
    key: "transparent-polls",
    title: { en: "Transparent polls", te: "పారదర్శక ఓట్లు" },
    description: {
      en: "Polls labeled as community opinion, never representative of India or Andhra Pradesh.",
      te: "సమాజ అభిప్రాయంగా లేబుల్ చేయబడిన ఓట్లు, భారతదేశం లేదా ఆంధ్రప్రదేశ్కు ఎప్పుడూ ప్రాతినిధ్యం వహించవు.",
    },
    planned: true,
  },
];

// Every gate that must exist before participation opens. Each is a commitment;
// none is implemented yet.
export const readinessGates: readonly ReadinessGate[] = [
  {
    key: "identity",
    title: { en: "Reviewable identity", te: "సమీక్షించదగిన గుర్తింపు" },
    description: {
      en: "An account with consent controls, so submissions are attributable and reversible.",
      te: "సమర్పణలు ఆపాదించదగినవి మరియు రద్దు చేయదగినవిగా ఉండేలా సమ్మతి నియంత్రణలతో కూడిన ఖాతా.",
    },
    planned: true,
  },
  {
    key: "consent",
    title: { en: "Explicit consent", te: "స్పష్టమైన సమ్మతి" },
    description: {
      en: "Choice about how submitted evidence is shown, stored and shared.",
      te: "సమర్పించిన సాక్ష్యం ఎలా చూపబడుతుందో, నిల్వ చేయబడుతుందో మరియు పంచబడుతుందో ఎంపిక.",
    },
    planned: true,
  },
  {
    key: "private-evidence",
    title: {
      en: "Private evidence handling",
      te: "ప్రైవేట్ సాక్ష్యం నిర్వహణ",
    },
    description: {
      en: "A secure path for sensitive community evidence that never exposes precise locations.",
      te: "సున్నితమైన సమాజ సాక్ష్యం కోసం సురక్షిత మార్గం, అది ఖచ్చితమైన స్థానాలను ఎప్పుడూ బహిర్గతం చేయదు.",
    },
    planned: true,
  },
  {
    key: "moderation",
    title: { en: "Moderation", te: "మోడరేషన్" },
    description: {
      en: "Review of every submission against the charter before public view.",
      te: "ప్రజా దృష్టికి ముందు చార్టర్కు వ్యతిరేకంగా ప్రతి సమర్పణ సమీక్ష.",
    },
    planned: true,
  },
  {
    key: "appeals",
    title: { en: "Appeals", te: "అప్పీళ్లు" },
    description: {
      en: "A path for authors to appeal moderation decisions.",
      te: "రచయితలు మోడరేషన్ నిర్ణయాలను అప్పీల్ చేయడానికి ఒక మార్గం.",
    },
    planned: true,
  },
  {
    key: "abuse",
    title: { en: "Abuse controls", te: "దుర్వినియోగ నియంత్రణలు" },
    description: {
      en: "Blocking and reporting without anonymous retaliation.",
      te: "అజ్ఞాత ప్రతీకారం లేకుండా నిరోధించడం మరియు నివేదించడం.",
    },
    planned: true,
  },
  {
    key: "audit",
    title: { en: "Immutable audit", te: "మార్పుచెందని ఆడిట్" },
    description: {
      en: "Every moderation action produces an audit record.",
      te: "ప్రతి మోడరేషన్ చర్య ఆడిట్ రికార్డును ఉత్పత్తి చేస్తుంది.",
    },
    planned: true,
  },
];

// The disclosure commitments every poll must carry when polls open. No poll
// exists today.
export const pollDisclosures: readonly PollDisclosure[] = [
  {
    key: "never-representative",
    title: { en: "Never representative", te: "ప్రాతినిధ్యం కాదు" },
    description: {
      en: "Every poll is labeled as community opinion and never described as representative of India or Andhra Pradesh.",
      te: "ప్రతి ఓటు సమాజ అభిప్రాయంగా లేబుల్ చేయబడుతుంది మరియు భారతదేశానికి లేదా ఆంధ్రప్రదేశ్కు ప్రాతినిధ్యం వహిస్తున్నట్లు ఎప్పుడూ వర్ణించబడదు.",
    },
    planned: true,
  },
  {
    key: "method",
    title: {
      en: "Method and size disclosed",
      te: "పద్ధతి మరియు పరిమాణం వెల్లడి",
    },
    description: {
      en: "Sample, method and caveats are shown with every result.",
      te: "నమూనా, పద్ధతి మరియు హెచ్చరికలు ప్రతి ఫలితంతో చూపబడతాయి.",
    },
    planned: true,
  },
  {
    key: "no-identity",
    title: {
      en: "No identity-linked results",
      te: "గుర్తింపు-లింక్ ఫలితాలు లేవు",
    },
    description: {
      en: "Votes are never published against an identity.",
      te: "ఓట్లు గుర్తింపుకు వ్యతిరేకంగా ఎప్పుడూ ప్రచురించబడవు.",
    },
    planned: true,
  },
  {
    key: "attached",
    title: { en: "Attached to records", te: "రికార్డులకు అనుబంధం" },
    description: {
      en: "Polls are attached to specific projects, schemes, services or places.",
      te: "ఓట్లు నిర్దిష్ట ప్రాజెక్టులు, పథకాలు, సేవలు లేదా ప్రదేశాలకు అనుబంధించబడతాయి.",
    },
    planned: true,
  },
];

// The evidence classes that keep community experience visibly separate from
// official, calculated and inferred claims.
export const evidenceClasses: readonly EvidenceClass[] = [
  {
    key: "official",
    kind: "official",
    title: { en: "Official", te: "అధికారిక" },
    description: {
      en: "Published by an identified government authority and linked to its source. Community never generates it.",
      te: "గుర్తించబడిన ప్రభుత్వ అధికారం ద్వారా ప్రచురించబడి దాని మూలానికి లింక్ చేయబడింది. సమాజం దీన్ని ఎప్పుడూ ఉత్పత్తి చేయదు.",
    },
  },
  {
    key: "calculated",
    kind: "calculated",
    title: { en: "Calculated", te: "గణించబడినది" },
    description: {
      en: "A reproducible platform calculation from cited official observations.",
      te: "ఉదహరించిన అధికారిక పరిశీలనల నుండి పునరుత్పాదక వేదిక గణన.",
    },
  },
  {
    key: "inferred",
    kind: "inferred",
    title: { en: "Inferred", te: "ఊహించబడినది" },
    description: {
      en: "A platform interpretation with uncertainty and review state shown.",
      te: "అనిశ్చితి మరియు సమీక్ష స్థితి చూపబడే వేదిక వివరణ.",
    },
  },
  {
    key: "community-reported",
    kind: "community",
    title: { en: "Community-reported", te: "సమాజ-నివేదిత" },
    description: {
      en: "Structured public experience, never silently presented as official fact.",
      te: "నిర్మాణాత్మక ప్రజా అనుభవం, అధికారిక వాస్తవంగా నిశ్శబ్దంగా ప్రదర్శించబడదు.",
    },
  },
];

// The charter rules that moderation would enforce when participation opens.
export const charterRules: readonly CharterRule[] = [
  {
    key: "no-impersonation",
    title: { en: "Never impersonate", te: "ఎన్నడూ గుర్తింపును అనుకరించవద్దు" },
    description: {
      en: "Community experience is never presented as official fact, and no account may pose as an authority.",
      te: "సమాజ అనుభవం అధికారిక వాస్తవంగా ఎప్పుడూ ప్రదర్శించబడదు మరియు ఏ ఖాతా అధికారిగా నటించకూడదు.",
    },
    planned: true,
  },
  {
    key: "no-anonymous-abuse",
    title: { en: "No anonymous abuse", te: "అజ్ఞాత దుర్వినియోగం లేదు" },
    description: {
      en: "Harassment, intimidation and abuse are blocked before public view.",
      te: "వేధింపు, బెదిరింపు మరియు దుర్వినియోగం ప్రజా దృష్టికి ముందే నిరోధించబడతాయి.",
    },
    planned: true,
  },
  {
    key: "no-precise-locations",
    title: { en: "No precise locations", te: "ఖచ్చితమైన స్థానాలు లేవు" },
    description: {
      en: "No submission is required to include a precise location.",
      te: "ఏ సమర్పణ ఖచ్చితమైన స్థానాన్ని చేర్చాల్సిన అవసరం లేదు.",
    },
    planned: true,
  },
  {
    key: "label-everything",
    title: { en: "Label everything", te: "ప్రతిదీ లేబుల్ చేయండి" },
    description: {
      en: "Every community item carries a visible community-reported label.",
      te: "ప్రతి సమాజ అంశం కనిపించే సమాజ-నివేదిత లేబుల్ను కలిగి ఉంటుంది.",
    },
    planned: true,
  },
];

export function localizedCommunityText(
  text: CommunityLocalizedText,
  locale: Locale,
): string {
  return (text as unknown as Record<string, string>)[locale] ?? text.en;
}

// Prepared participation state for the community API. Participation is closed,
// so there are no records.
export const preparedCommunity: readonly never[] = [];
