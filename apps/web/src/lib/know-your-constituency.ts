import type { Locale } from "./catalog-types";
import type {
  ElectionResultLocalizedText,
  ElectionResultRecord,
} from "./election-results";

export const seatStatusWords = {
  en: {
    died: "Died",
    resigned: "Resigned",
    disqualified: "Disqualified",
    bye_election: "By-election",
    none: "No change recorded",
  },
  te: {
    died: "మరణం",
    resigned: "రాజీనామా",
    disqualified: "అనర్హత",
    bye_election: "ఉప ఎన్నిక",
    none: "మార్పు నమోదు కాలేదు",
  },
} as const;

export function localizedConstituencyText(
  value: ElectionResultLocalizedText,
  locale: Locale,
): string {
  return locale === "te" ? value.te : value.en;
}

export function seatStatusWord(value: string, locale: Locale): string {
  const words =
    (seatStatusWords as unknown as Record<string, typeof seatStatusWords.en>)[
      locale
    ] ?? seatStatusWords.en;
  if (
    value === "died" ||
    value === "resigned" ||
    value === "disqualified" ||
    value === "bye_election"
  ) {
    return words[value];
  }
  return words.none;
}

export function latestTermId(records: readonly ElectionResultRecord[]): number {
  return records.reduce(
    (max, record) => (record.term_id > max ? record.term_id : max),
    0,
  );
}

export function resultDistricts(
  records: readonly ElectionResultRecord[],
  termId: number,
): { en: string; te: string }[] {
  const seen = new Set<string>();
  const districts: { en: string; te: string }[] = [];
  records
    .filter((record) => record.term_id === termId)
    .forEach((record) => {
      const en = record.district.value.en;
      if (seen.has(en)) return;
      seen.add(en);
      districts.push({ en, te: record.district.value.te });
    });
  return districts.sort((a, b) => a.en.localeCompare(b.en));
}

export function seatsForDistrict(
  records: readonly ElectionResultRecord[],
  termId: number,
  districtEn: string,
): ElectionResultRecord[] {
  return records
    .filter(
      (record) =>
        record.term_id === termId && record.district.value.en === districtEn,
    )
    .sort((a, b) => {
      const aNo = parseInt(a.constituency_no, 10);
      const bNo = parseInt(b.constituency_no, 10);
      if (Number.isFinite(aNo) && Number.isFinite(bNo) && aNo !== bNo) {
        return aNo - bNo;
      }
      return a.slug.localeCompare(b.slug);
    });
}

export function seatBySlug(
  records: readonly ElectionResultRecord[],
  slug: string,
): ElectionResultRecord | null {
  return records.find((record) => record.slug === slug) ?? null;
}

export function constituencyPageUrl(
  origin: string,
  districtEn: string,
  slug: string,
): string {
  const params = new URLSearchParams({ district: districtEn, seat: slug });
  return `${origin}/know-your-constituency?${params.toString()}`;
}

export function buildShareText(
  record: ElectionResultRecord,
  locale: Locale,
  pageUrl: string,
): string {
  const name = localizedConstituencyText(record.member_name.value, locale);
  const constituency = localizedConstituencyText(
    record.constituency.value,
    locale,
  );
  const district = localizedConstituencyText(record.district.value, locale);
  const party = record.party
    ? localizedConstituencyText(record.party.value, locale)
    : "";
  const term = localizedConstituencyText(record.term_period.value, locale);
  const status = seatStatusWord(record.seat_status.value, locale);
  const source = record.member_name.source.source_name;
  const partyClause = party ? ` (${party})` : "";

  if (locale === "te") {
    return (
      `మీ నియోజకవర్గం ${constituency}కు శాసనసభ సభ్యుడు: ${name}${partyClause}. ` +
      `పదవీ కాలం: ${term}. సీటు స్థితి: ${status}. జిల్లా: ${district}. ` +
      `మూలం: ${source}. తనిఖీ చేయండి: ${pageUrl}`
    );
  }
  return (
    `Your MLA in ${constituency} is ${name}${partyClause}, elected in ${term}. ` +
    `Seat status: ${status}. District: ${district}. Source: ${source}. ` +
    `Check it here: ${pageUrl}`
  );
}

export function buildWhatsAppShareUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
