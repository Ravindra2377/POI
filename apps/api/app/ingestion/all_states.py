"""Official registry and ingestion helpers for all 28 States and 8 Union Territories of India.

Every state and union territory entry references official Local Government Directory (LGD)
and ISO-3166-2:IN codes per Non-negotiable Rules #1 and #4. Each entry also lists the
officially recognised languages for the territory, anchored to the platform language registry.
"""

from dataclasses import dataclass
from typing import Any

from app.ingestion.languages import LANGUAGES_BY_CODE


@dataclass(frozen=True)
class StateRecord:
    """Official record for a State or Union Territory of India."""

    iso_code: str  # e.g., IN-AP, IN-DL, IN-TG
    lgd_code: int
    name_en: str
    name_native: str
    native_language: str
    official_languages: tuple[str, ...]
    category: str  # "state" or "union_territory"
    capital: str
    assembly_seats: int
    parliamentary_seats: int
    official_website: str


# All 28 States + 8 Union Territories (36 Total Level-1 Divisions)
ALL_INDIA_STATES_UTS: list[StateRecord] = [
    # 28 STATES
    StateRecord(
        "IN-AP", 28, "Andhra Pradesh", "ఆంధ్రప్రదేశ్", "te", ("te", "en"), "state",
        "Amaravati", 175, 25, "https://ap.gov.in",
    ),
    StateRecord(
        "IN-AR", 12, "Arunachal Pradesh", "अरुणाचल प्रदेश", "hi", ("en",), "state",
        "Itanagar", 60, 2, "https://arunachalpradesh.gov.in",
    ),
    StateRecord(
        "IN-AS", 18, "Assam", "অসম", "as", ("as", "bn", "brx", "en"), "state",
        "Dispur", 126, 14, "https://assam.gov.in",
    ),
    StateRecord(
        "IN-BR", 10, "Bihar", "बिहार", "hi", ("hi", "ur"), "state",
        "Patna", 243, 40, "https://bihar.gov.in",
    ),
    StateRecord(
        "IN-CT", 22, "Chhattisgarh", "छत्तीसगढ़", "hi", ("hi",), "state",
        "Raipur", 90, 11, "https://cgstate.gov.in",
    ),
    StateRecord(
        "IN-GA", 30, "Goa", "गोवा", "kok", ("kok", "mr", "en"), "state",
        "Panaji", 40, 2, "https://goa.gov.in",
    ),
    StateRecord(
        "IN-GJ", 24, "Gujarat", "ગુજરાત", "gu", ("gu", "en"), "state",
        "Gandhinagar", 182, 26, "https://gujaratindia.gov.in",
    ),
    StateRecord(
        "IN-HR", 6, "Haryana", "हरियाणा", "hi", ("hi", "pa"), "state",
        "Chandigarh", 90, 10, "https://haryana.gov.in",
    ),
    StateRecord(
        "IN-HP", 2, "Himachal Pradesh", "हिमाचल प्रदेश", "hi", ("hi",), "state",
        "Shimla", 68, 4, "https://himachal.nic.in",
    ),
    StateRecord(
        "IN-JH", 20, "Jharkhand", "झारखंड", "hi", ("hi",), "state",
        "Ranchi", 81, 14, "https://jharkhand.gov.in",
    ),
    StateRecord(
        "IN-KA", 29, "Karnataka", "ಕರ್ನಾಟಕ", "kn", ("kn", "en"), "state",
        "Bengaluru", 224, 28, "https://karnataka.gov.in",
    ),
    StateRecord(
        "IN-KL", 32, "Kerala", "കേരളം", "ml", ("ml", "en"), "state",
        "Thiruvananthapuram", 140, 20, "https://kerala.gov.in",
    ),
    StateRecord(
        "IN-MP", 23, "Madhya Pradesh", "मध्य प्रदेश", "hi", ("hi",), "state",
        "Bhopal", 230, 29, "https://mp.gov.in",
    ),
    StateRecord(
        "IN-MH", 27, "Maharashtra", "महाराष्ट्र", "mr", ("mr", "hi"), "state",
        "Mumbai", 288, 48, "https://maharashtra.gov.in",
    ),
    StateRecord(
        "IN-MN", 14, "Manipur", "মণিপুর", "mni", ("mni", "en"), "state",
        "Imphal", 60, 2, "https://manipur.gov.in",
    ),
    StateRecord(
        "IN-ML", 17, "Meghalaya", "Meghalaya", "en", ("en",), "state",
        "Shillong", 60, 2, "https://meghalaya.gov.in",
    ),
    StateRecord(
        "IN-MZ", 15, "Mizoram", "Mizoram", "mzo", ("mzo", "en"), "state",
        "Aizawl", 40, 1, "https://mizoram.gov.in",
    ),
    StateRecord(
        "IN-NL", 13, "Nagaland", "Nagaland", "en", ("en",), "state",
        "Kohima", 60, 1, "https://nagaland.gov.in",
    ),
    StateRecord(
        "IN-OR", 21, "Odisha", "ଓଡ଼ିଶା", "or", ("or",), "state",
        "Bhubaneswar", 147, 21, "https://odisha.gov.in",
    ),
    StateRecord(
        "IN-PB", 3, "Punjab", "ਪੰਜਾਬ", "pa", ("pa",), "state",
        "Chandigarh", 117, 13, "https://punjab.gov.in",
    ),
    StateRecord(
        "IN-RJ", 8, "Rajasthan", "राजस्थान", "hi", ("hi",), "state",
        "Jaipur", 200, 25, "https://rajasthan.gov.in",
    ),
    StateRecord(
        "IN-SK", 11, "Sikkim", "सिक्किम", "ne", ("ne", "en", "hi"), "state",
        "Gangtok", 32, 1, "https://sikkim.gov.in",
    ),
    StateRecord(
        "IN-TN", 33, "Tamil Nadu", "தமிழ்நாடு", "ta", ("ta", "en"), "state",
        "Chennai", 234, 39, "https://tn.gov.in",
    ),
    StateRecord(
        "IN-TG", 36, "Telangana", "తెలంగాణ", "te", ("te", "ur"), "state",
        "Hyderabad", 119, 17, "https://telangana.gov.in",
    ),
    StateRecord(
        "IN-TR", 16, "Tripura", "ত্রিপুরা", "bn", ("bn", "en"), "state",
        "Agartala", 60, 2, "https://tripura.gov.in",
    ),
    StateRecord(
        "IN-UP", 9, "Uttar Pradesh", "उत्तर प्रदेश", "hi", ("hi", "ur"), "state",
        "Lucknow", 403, 80, "https://up.gov.in",
    ),
    StateRecord(
        "IN-UT", 5, "Uttarakhand", "उत्तराखंड", "hi", ("hi", "sa"), "state",
        "Dehradun", 70, 5, "https://uk.gov.in",
    ),
    StateRecord(
        "IN-WB", 19, "West Bengal", "পশ্চিমবঙ্গ", "bn", ("bn", "en"), "state",
        "Kolkata", 294, 42, "https://wb.gov.in",
    ),
    # 8 UNION TERRITORIES
    StateRecord(
        iso_code="IN-AN",
        lgd_code=35,
        name_en="Andaman and Nicobar Islands",
        name_native="अंडमान और निकोबार",
        native_language="hi",
        official_languages=("hi", "en"),
        category="union_territory",
        capital="Port Blair",
        assembly_seats=0,
        parliamentary_seats=1,
        official_website="https://andaman.gov.in",
    ),
    StateRecord(
        iso_code="IN-CH",
        lgd_code=4,
        name_en="Chandigarh",
        name_native="चंडीगढ़",
        native_language="hi",
        official_languages=("en", "hi", "pa"),
        category="union_territory",
        capital="Chandigarh",
        assembly_seats=0,
        parliamentary_seats=1,
        official_website="https://chandigarh.gov.in",
    ),
    StateRecord(
        iso_code="IN-DH",
        lgd_code=26,
        name_en="Dadra & Nagar Haveli & Daman & Diu",
        name_native="दादरा नगर हवेली",
        native_language="hi",
        official_languages=("gu", "hi"),
        category="union_territory",
        capital="Daman",
        assembly_seats=0,
        parliamentary_seats=1,
        official_website="https://daman.nic.in",
    ),
    StateRecord(
        iso_code="IN-DL",
        lgd_code=7,
        name_en="Delhi (NCT)",
        name_native="दिल्ली",
        native_language="hi",
        official_languages=("hi", "en", "ur", "pa"),
        category="union_territory",
        capital="New Delhi",
        assembly_seats=70,
        parliamentary_seats=7,
        official_website="https://delhi.gov.in",
    ),
    StateRecord(
        iso_code="IN-JK",
        lgd_code=1,
        name_en="Jammu & Kashmir",
        name_native="जम्मू-कश्मीर",
        native_language="hi",
        official_languages=("hi", "ur", "en", "ks", "doi"),
        category="union_territory",
        capital="Srinagar/Jammu",
        assembly_seats=90,
        parliamentary_seats=5,
        official_website="https://jk.gov.in",
    ),
    StateRecord(
        iso_code="IN-LA",
        lgd_code=37,
        name_en="Ladakh",
        name_native="लद्दाख",
        native_language="hi",
        official_languages=("hi", "en"),
        category="union_territory",
        capital="Leh/Kargil",
        assembly_seats=0,
        parliamentary_seats=1,
        official_website="https://ladakh.gov.in",
    ),
    StateRecord(
        iso_code="IN-LD",
        lgd_code=31,
        name_en="Lakshadweep",
        name_native="ലക്ഷദ്വീപ്",
        native_language="ml",
        official_languages=("ml",),
        category="union_territory",
        capital="Kavaratti",
        assembly_seats=0,
        parliamentary_seats=1,
        official_website="https://lakshadweep.gov.in",
    ),
    StateRecord(
        iso_code="IN-PY",
        lgd_code=34,
        name_en="Puducherry",
        name_native="புதுச்சேரி",
        native_language="ta",
        official_languages=("ta", "ml", "te", "en"),
        category="union_territory",
        capital="Puducherry",
        assembly_seats=30,
        parliamentary_seats=1,
        official_website="https://puducherry.gov.in",
    ),
]


def get_all_states() -> list[dict[str, Any]]:
    """Return all 36 States and Union Territories as clean dictionary records."""
    return [
        {
            "iso_code": st.iso_code,
            "lgd_code": st.lgd_code,
            "name_en": st.name_en,
            "name_native": st.name_native,
            "native_language": st.native_language,
            "official_languages": list(st.official_languages),
            "category": st.category,
            "capital": st.capital,
            "assembly_seats": st.assembly_seats,
            "parliamentary_seats": st.parliamentary_seats,
            "official_website": st.official_website,
        }
        for st in ALL_INDIA_STATES_UTS
    ]


def validate_state_language_codes() -> list[str]:
    """Return any state language codes missing from the language registry."""
    return [
        language
        for st in ALL_INDIA_STATES_UTS
        for language in (st.native_language, *st.official_languages)
        if language not in LANGUAGES_BY_CODE
    ]