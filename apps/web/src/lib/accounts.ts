import type { Locale } from "./catalog-types";

export interface AccountLocalizedText {
  en: string;
  te: string;
}

export interface ConsentChoice {
  key: "area-alerts" | "evidence";
  label: AccountLocalizedText;
  description: AccountLocalizedText;
  planned: true;
}

export interface AccountReportDomain {
  key: string;
  directoryHref: string;
  name: AccountLocalizedText;
  description: AccountLocalizedText;
}

// The consent choices an account's consent controls would offer once identity,
// privacy and audit controls are built. Nothing can be chosen or stored yet.
export const consentChoices: readonly ConsentChoice[] = [
  {
    key: "area-alerts",
    label: { en: "Area alerts", te: "ప్రాంత హెచ్చరికలు" },
    description: {
      en: "Alert me when reviewed records are published for a district I choose.",
      te: "నేను ఎంచుకున్న జిల్లాకు సమీక్షించిన రికార్డులు ప్రచురించబడినప్పుడు నాకు తెలియజేయండి.",
    },
    planned: true,
  },
  {
    key: "evidence",
    label: {
      en: "Submitted evidence visibility",
      te: "సమర్పించిన ఆధారం దృశ్యమానత",
    },
    description: {
      en: "Choose whether any community evidence is shown under my identity.",
      te: "మీ గుర్తింపు క్రింద ఏదైనా సమాజ ఆధారం చూపబడిందా లేదా అని ఎంచుకోండి.",
    },
    planned: true,
  },
];

// The five prepared directory domains that structured reports would aggregate.
export const accountReportDomains: readonly AccountReportDomain[] = [
  {
    key: "schemes",
    directoryHref: "/schemes",
    name: { en: "Schemes", te: "పథకాలు" },
    description: {
      en: "A structured report of reviewed scheme records.",
      te: "సమీక్షించిన పథకం రికార్డుల నిర్మాణాత్మక నివేదిక.",
    },
  },
  {
    key: "projects",
    directoryHref: "/projects",
    name: { en: "Projects", te: "ప్రాజెక్టులు" },
    description: {
      en: "A structured report of reviewed project records.",
      te: "సమీక్షించిన ప్రాజెక్టు రికార్డుల నిర్మాణాత్మక నివేదిక.",
    },
  },
  {
    key: "public-money",
    directoryHref: "/public-money",
    name: { en: "Public Money", te: "ప్రజా ధనం" },
    description: {
      en: "A structured report of reviewed financial observations.",
      te: "సమీక్షించిన ఆర్థిక పరిశీలనల నిర్మాణాత్మక నివేదిక.",
    },
  },
  {
    key: "procurement",
    directoryHref: "/procurement",
    name: { en: "Procurement", te: "కొనుగోళ్లు" },
    description: {
      en: "A structured report of reviewed tenders and contracts.",
      te: "సమీక్షించిన టెండర్లు, కాంట్రాక్టుల నిర్మాణాత్మక నివేదిక.",
    },
  },
  {
    key: "officeholders",
    directoryHref: "/officeholders",
    name: { en: "Officeholders", te: "అధికారులు" },
    description: {
      en: "A structured report of reviewed roles and terms.",
      te: "సమీక్షించిన పాత్రలు, పదవీ కాలాల నిర్మాణాత్మక నివేదిక.",
    },
  },
];

export function localizedAccountText(
  text: AccountLocalizedText,
  locale: Locale,
): string {
  return text[locale];
}
