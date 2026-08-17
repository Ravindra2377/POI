/**
 * Client registry of Indian languages supported by the platform.
 * Mirrors apps/api/app/ingestion/languages.py. Covers all 22 Eighth Schedule
 * official languages of India, plus English and Mizo.
 */

export interface LanguageInfo {
  code: string;
  english_name: string;
  native_name: string;
  script: string;
  eighth_schedule: boolean;
}

export const LANGUAGE_REGISTRY: LanguageInfo[] = [
  {
    code: "en",
    english_name: "English",
    native_name: "English",
    script: "Latin",
    eighth_schedule: false,
  },
  {
    code: "te",
    english_name: "Telugu",
    native_name: "తెలుగు",
    script: "Telugu",
    eighth_schedule: true,
  },
  {
    code: "as",
    english_name: "Assamese",
    native_name: "অসমীয়া",
    script: "Bengali-Assamese",
    eighth_schedule: true,
  },
  {
    code: "bn",
    english_name: "Bengali",
    native_name: "বাংলা",
    script: "Bengali-Assamese",
    eighth_schedule: true,
  },
  {
    code: "brx",
    english_name: "Bodo",
    native_name: "बर'",
    script: "Devanagari",
    eighth_schedule: true,
  },
  {
    code: "doi",
    english_name: "Dogri",
    native_name: "डोगरी",
    script: "Devanagari",
    eighth_schedule: true,
  },
  {
    code: "gu",
    english_name: "Gujarati",
    native_name: "ગુજરાતી",
    script: "Gujarati",
    eighth_schedule: true,
  },
  {
    code: "hi",
    english_name: "Hindi",
    native_name: "हिन्दी",
    script: "Devanagari",
    eighth_schedule: true,
  },
  {
    code: "kn",
    english_name: "Kannada",
    native_name: "ಕನ್ನಡ",
    script: "Kannada",
    eighth_schedule: true,
  },
  {
    code: "ks",
    english_name: "Kashmiri",
    native_name: "کٲشُر",
    script: "Perso-Arabic",
    eighth_schedule: true,
  },
  {
    code: "kok",
    english_name: "Konkani",
    native_name: "कोंकणी",
    script: "Devanagari",
    eighth_schedule: true,
  },
  {
    code: "mai",
    english_name: "Maithili",
    native_name: "मैथिली",
    script: "Devanagari",
    eighth_schedule: true,
  },
  {
    code: "ml",
    english_name: "Malayalam",
    native_name: "മലയാളം",
    script: "Malayalam",
    eighth_schedule: true,
  },
  {
    code: "mni",
    english_name: "Manipuri",
    native_name: "মণিপুরী",
    script: "Bengali-Assamese",
    eighth_schedule: true,
  },
  {
    code: "mr",
    english_name: "Marathi",
    native_name: "मराठी",
    script: "Devanagari",
    eighth_schedule: true,
  },
  {
    code: "mzo",
    english_name: "Mizo",
    native_name: "Mizo",
    script: "Latin",
    eighth_schedule: false,
  },
  {
    code: "ne",
    english_name: "Nepali",
    native_name: "नेपाली",
    script: "Devanagari",
    eighth_schedule: true,
  },
  {
    code: "or",
    english_name: "Odia",
    native_name: "ଓଡ଼ିଆ",
    script: "Odia",
    eighth_schedule: true,
  },
  {
    code: "pa",
    english_name: "Punjabi",
    native_name: "ਪੰਜਾਬੀ",
    script: "Gurmukhi",
    eighth_schedule: true,
  },
  {
    code: "sa",
    english_name: "Sanskrit",
    native_name: "संस्कृतम्",
    script: "Devanagari",
    eighth_schedule: true,
  },
  {
    code: "sat",
    english_name: "Santali",
    native_name: "ᱥᱟᱱᱛᱟᱲᱤ",
    script: "Ol Chiki",
    eighth_schedule: true,
  },
  {
    code: "sd",
    english_name: "Sindhi",
    native_name: "سنڌي",
    script: "Perso-Arabic",
    eighth_schedule: true,
  },
  {
    code: "ta",
    english_name: "Tamil",
    native_name: "தமிழ்",
    script: "Tamil",
    eighth_schedule: true,
  },
  {
    code: "ur",
    english_name: "Urdu",
    native_name: "اردو",
    script: "Perso-Arabic",
    eighth_schedule: true,
  },
];

export const LANGUAGES_BY_CODE: Record<string, LanguageInfo> =
  Object.fromEntries(
    LANGUAGE_REGISTRY.map((language) => [language.code, language]),
  );

export function languageName(code: string): string {
  const language = LANGUAGES_BY_CODE[code];
  if (!language) return code.toUpperCase();
  return code === language.native_name
    ? language.english_name
    : language.native_name;
}

export const EIGHTH_SCHEDULE_CODES = new Set(
  LANGUAGE_REGISTRY.filter((language) => language.eighth_schedule).map(
    (language) => language.code,
  ),
);
