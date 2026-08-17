"""Official registry of Indian languages supported by the platform.

Covers all 22 Eighth Schedule official languages of India, plus English and
Mizo, which are official/administrative languages of specific States or Union
Territories. Every entry carries an ISO 639-1/639-3 code, English name, native
name, and writing system. This registry is the single source of truth for the
language codes referenced by the State/UT registry and feed ingestion workers.
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class LanguageRecord:
    """Official metadata for a language available on the platform."""

    code: str  # ISO 639-1 or 639-3 code, e.g., "te", "mni", "mzo"
    english_name: str
    native_name: str
    script: str
    eighth_schedule: bool


# All 22 Eighth Schedule languages + English + Mizo.
LANGUAGE_REGISTRY: tuple[LanguageRecord, ...] = (
    LanguageRecord("en", "English", "English", "Latin", False),
    LanguageRecord("te", "Telugu", "తెలుగు", "Telugu", True),
    LanguageRecord("as", "Assamese", "অসমীয়া", "Bengali-Assamese", True),
    LanguageRecord("bn", "Bengali", "বাংলা", "Bengali-Assamese", True),
    LanguageRecord("brx", "Bodo", "बर'", "Devanagari", True),
    LanguageRecord("doi", "Dogri", "डोगरी", "Devanagari", True),
    LanguageRecord("gu", "Gujarati", "ગુજરાતી", "Gujarati", True),
    LanguageRecord("hi", "Hindi", "हिन्दी", "Devanagari", True),
    LanguageRecord("kn", "Kannada", "ಕನ್ನಡ", "Kannada", True),
    LanguageRecord("ks", "Kashmiri", "کٲشُر", "Perso-Arabic", True),
    LanguageRecord("kok", "Konkani", "कोंकणी", "Devanagari", True),
    LanguageRecord("mai", "Maithili", "मैथिली", "Devanagari", True),
    LanguageRecord("ml", "Malayalam", "മലയാളം", "Malayalam", True),
    LanguageRecord("mni", "Manipuri", "মণিপুরী", "Bengali-Assamese", True),
    LanguageRecord("mr", "Marathi", "मराठी", "Devanagari", True),
    LanguageRecord("mzo", "Mizo", "Mizo", "Latin", False),
    LanguageRecord("ne", "Nepali", "नेपाली", "Devanagari", True),
    LanguageRecord("or", "Odia", "ଓଡ଼ିଆ", "Odia", True),
    LanguageRecord("pa", "Punjabi", "ਪੰਜਾਬੀ", "Gurmukhi", True),
    LanguageRecord("sa", "Sanskrit", "संस्कृतम्", "Devanagari", True),
    LanguageRecord("sat", "Santali", "ᱥᱟᱱᱛᱟᱲᱤ", "Ol Chiki", True),
    LanguageRecord("sd", "Sindhi", "سنڌي", "Perso-Arabic", True),
    LanguageRecord("ta", "Tamil", "தமிழ்", "Tamil", True),
    LanguageRecord("ur", "Urdu", "اردو", "Perso-Arabic", True),
)

LANGUAGES_BY_CODE: dict[str, LanguageRecord] = {r.code: r for r in LANGUAGE_REGISTRY}

EIGHTH_SCHEDULE_CODES = frozenset(r.code for r in LANGUAGE_REGISTRY if r.eighth_schedule)