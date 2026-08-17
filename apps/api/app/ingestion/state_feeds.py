"""State-by-State official news & press release feed registry.

Registers the verified official Press Information Bureau (PIB) regional RSS feed
for each State and Union Territory, anchored to PIB's published regional office
directory. Feeds are read-only official sources per Non-negotiable Rules #1, #3,
and #4; the per-state ingestion worker polls only these registered feeds.

PIB regional RSS feeds follow the official pattern
``https://pib.gov.in/RssMain.aspx?ModId=6&Lang=1&Regid=<office_id>`` where the
office identifiers are taken from PIB's published organisational/regional
directory (English releases, Lang=1).
"""

from dataclasses import dataclass, field

from app.ingestion.all_states import ALL_INDIA_STATES_UTS
from app.ingestion.languages import LANGUAGES_BY_CODE
from app.models.enums import LanguageCode


@dataclass(frozen=True)
class StateFeed:
    """A single registered official feed for a State or Union Territory."""

    key: str
    name: str
    publisher: str
    url: str
    official_domain: str
    jurisdiction_code: str
    language_code: LanguageCode
    source_type: str = "press_release_feed"


@dataclass(frozen=True)
class StateFeedRegistryEntry:
    """Feed registration for one State or Union Territory."""

    iso_code: str
    name_en: str
    pib_office: str | None
    feeds: tuple[StateFeed, ...] = field(default_factory=tuple)


PIB_ENGLISH_RSS = "https://pib.gov.in/RssMain.aspx?ModId=6&Lang=1&Regid={office_id}"

# PIB regional offices and their office identifiers, per PIB's regional directory.
_PIB_OFFICE_IDS: dict[str, int] = {
    "IN-AP": 45,  # PIB Vijayawada
    "IN-AR": 36,  # PIB Itanagar
    "IN-AS": 23,  # PIB Guwahati
    "IN-BR": 40,  # PIB Patna
    "IN-CT": 43,  # PIB Raipur
    "IN-GA": 1,  # PIB Mumbai
    "IN-GJ": 22,  # PIB Ahmedabad
    "IN-HR": 17,  # PIB Chandigarh
    "IN-HP": 42,  # PIB Shimla
    "IN-JH": 41,  # PIB Ranchi
    "IN-KA": 20,  # PIB Bengaluru
    "IN-KL": 24,  # PIB Thiruvananthapuram
    "IN-MP": 38,  # PIB Bhopal
    "IN-MH": 1,  # PIB Mumbai
    "IN-MN": 30,  # PIB Imphal
    "IN-ML": 35,  # PIB Shillong
    "IN-MZ": 31,  # PIB Mizoram
    "IN-NL": 34,  # PIB Kohima
    "IN-OR": 21,  # PIB Bhubaneswar
    "IN-PB": 17,  # PIB Chandigarh
    "IN-RJ": 39,  # PIB Jaipur
    "IN-SK": 33,  # PIB Gangtok
    "IN-TN": 6,  # PIB Chennai
    "IN-TG": 5,  # PIB Hyderabad
    "IN-TR": 32,  # PIB Agartala
    "IN-UP": 37,  # PIB Lucknow
    "IN-UT": 46,  # PIB Dehradun
    "IN-WB": 19,  # PIB Kolkata
    "IN-AN": 48,  # PIB National
    "IN-CH": 17,  # PIB Chandigarh
    "IN-DH": 48,  # PIB National
    "IN-DL": 3,  # PIB Delhi
    "IN-JK": 44,  # PIB Jammu and Kashmir
    "IN-LA": 44,  # PIB Jammu and Kashmir
    "IN-LD": 24,  # PIB Thiruvananthapuram
    "IN-PY": 6,  # PIB Chennai
}

_PIB_OFFICE_NAMES: dict[int, str] = {
    1: "PIB Mumbai",
    3: "PIB Delhi",
    5: "PIB Hyderabad",
    6: "PIB Chennai",
    17: "PIB Chandigarh",
    19: "PIB Kolkata",
    20: "PIB Bengaluru",
    21: "PIB Bhubaneswar",
    22: "PIB Ahmedabad",
    23: "PIB Guwahati",
    24: "PIB Thiruvananthapuram",
    30: "PIB Imphal",
    31: "PIB Mizoram",
    32: "PIB Agartala",
    33: "PIB Gangtok",
    34: "PIB Kohima",
    35: "PIB Shillong",
    36: "PIB Itanagar",
    37: "PIB Lucknow",
    38: "PIB Bhopal",
    39: "PIB Jaipur",
    40: "PIB Patna",
    41: "PIB Ranchi",
    42: "PIB Shimla",
    43: "PIB Raipur",
    44: "PIB Jammu and Kashmir",
    45: "PIB Vijayawada",
    46: "PIB Dehradun",
    48: "PIB National",
}


def _pib_feed(iso_code: str, office_id: int, office_name: str) -> StateFeed:
    key = f"{iso_code.lower()}-pib"
    return StateFeed(
        key=key,
        name=f"Press Information Bureau - {office_name}",
        publisher=f"Press Information Bureau, Government of India ({office_name})",
        url=PIB_ENGLISH_RSS.format(office_id=office_id),
        official_domain="pib.gov.in",
        jurisdiction_code=iso_code,
        language_code=LanguageCode.EN,
    )


# Full registry for all 36 States and Union Territories.
STATE_FEED_REGISTRY: dict[str, StateFeedRegistryEntry] = {}
for _st in ALL_INDIA_STATES_UTS:
    _office_id = _PIB_OFFICE_IDS[_st.iso_code]
    _office_name = _PIB_OFFICE_NAMES[_office_id]
    STATE_FEED_REGISTRY[_st.iso_code] = StateFeedRegistryEntry(
        iso_code=_st.iso_code,
        name_en=_st.name_en,
        pib_office=_office_name,
        feeds=(_pib_feed(_st.iso_code, _office_id, _office_name),),
    )


def get_state_feeds(iso_code: str) -> tuple[StateFeed, ...]:
    """Return the registered official feeds for a State or Union Territory."""
    entry = STATE_FEED_REGISTRY.get(iso_code)
    return entry.feeds if entry is not None else ()


def get_all_registered_feed_keys() -> list[str]:
    """Return every registered feed key across all 36 States and Union Territories."""
    return [feed.key for entry in STATE_FEED_REGISTRY.values() for feed in entry.feeds]


def validate_feed_registry() -> list[str]:
    """Return any invalid language or jurisdiction codes across registered feeds."""
    problems: list[str] = []
    for entry in STATE_FEED_REGISTRY.values():
        if entry.iso_code not in {st.iso_code for st in ALL_INDIA_STATES_UTS}:
            problems.append(f"{entry.iso_code}: unknown jurisdiction")
        for feed in entry.feeds:
            if feed.jurisdiction_code != entry.iso_code:
                problems.append(f"{feed.key}: jurisdiction mismatch")
            if feed.language_code.value not in LANGUAGES_BY_CODE:
                problems.append(f"{feed.key}: unknown language {feed.language_code}")
    return problems
