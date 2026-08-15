import type { Locale } from "./catalog-types";

export interface AreaLocalizedText {
  en: string;
  te: string;
}

export interface AreaDomain {
  key: string;
  directoryHref: string;
  name: AreaLocalizedText;
  description: AreaLocalizedText;
}

// The five prepared domain directories that an area briefing aggregates.
export const areaDomains: readonly AreaDomain[] = [
  {
    key: "schemes",
    directoryHref: "/schemes",
    name: { en: "Schemes", te: "పథకాలు" },
    description: {
      en: "Reviewed scheme records tagged to your selected district.",
      te: "మీ ఎంచుకున్న జిల్లాకు అనుబంధించిన సమీక్షించిన పథకం రికార్డులు.",
    },
  },
  {
    key: "projects",
    directoryHref: "/projects",
    name: { en: "Projects", te: "ప్రాజెక్టులు" },
    description: {
      en: "Reviewed project records reported in your selected district.",
      te: "మీ ఎంచుకున్న జిల్లాలో నివేదించిన సమీక్షించిన ప్రాజెక్టు రికార్డులు.",
    },
  },
  {
    key: "public-money",
    directoryHref: "/public-money",
    name: { en: "Public Money", te: "ప్రజా ధనం" },
    description: {
      en: "Reviewed financial observations for your selected district.",
      te: "మీ ఎంచుకున్న జిల్లాకు సంబంధించిన సమీక్షించిన ఆర్థిక పరిశీలనలు.",
    },
  },
  {
    key: "procurement",
    directoryHref: "/procurement",
    name: { en: "Procurement", te: "కొనుగోళ్లు" },
    description: {
      en: "Reviewed tenders and contracts for your selected district.",
      te: "మీ ఎంచుకున్న జిల్లాకు సంబంధించిన సమీక్షించిన టెండర్లు, కాంట్రాక్టులు.",
    },
  },
  {
    key: "officeholders",
    directoryHref: "/officeholders",
    name: { en: "Officeholders", te: "అధికారులు" },
    description: {
      en: "Reviewed roles and terms covering your selected district.",
      te: "మీ ఎంచుకున్న జిల్లాను కవర్ చేసే సమీక్షించిన పాత్రలు, పదవీ కాలాలు.",
    },
  },
] as const;

export function localizedAreaText(
  value: AreaLocalizedText,
  locale: Locale,
): string {
  return locale === "te" ? value.te : value.en;
}

export function districtName(
  record: { name_en: string; name_te: string | null },
  locale: Locale,
): string {
  return locale === "te" && record.name_te ? record.name_te : record.name_en;
}
